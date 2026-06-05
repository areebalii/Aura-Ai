import Chat from '../models/chat.model.js';
import { generateSmartTitle } from '../services/gemini.service.js';
// Make sure you import your SDK model instance or a stream handler function from your service file
// Example using Google Gen AI SDK or Groq SDK inside your controller logic:
import { GoogleGenAI } from '@google/genai';

// 1. CREATE A NEW CHAT SESSION THREAD
export const createChat = async (req, res) => {
  try {
    console.log("👤 Authenticated user payload metadata:", req.user);

    const newChat = await Chat.create({
      userId: req.user.id || req.user._id,
      title: req.body.title || 'New Conversation',
      messages: []
    });

    res.status(201).json(newChat);
  } catch (error) {
    console.error("❌ Failed to create chat in DB:", error.message);
    res.status(400).json({ message: 'Failed to initialize chat thread.', error: error.message });
  }
};

// 2. FETCH ALL CHATS FOR THE SIGNED-IN USER
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve history indexes.', error: error.message });
  }
};

// 3. LIVE UPGRADED APPEND & GENERATE CONTROLLER METHOD (STREAMING ENABLED)
export const appendMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messages } = req.body;
    const userMessage = messages[0];

    // Step A: Pull matching context records from MongoDB first
    const activeChat = await Chat.findOne({ _id: chatId, userId: req.user.id });

    if (!activeChat) {
      return res.status(404).json({ message: 'Conversation profile context not found.' });
    }

    // Step B: Atomically append the user prompt to MongoDB immediately to protect context data state
    await Chat.updateOne(
      { _id: chatId, userId: req.user.id },
      { $push: { messages: userMessage } }
    );

    // Step C: Set up standard HTTP response headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevents Nginx/Proxy layers from blocking chunks

    // Step D: Reconstruct the full historical array context chain for the upstream AI provider
    const fullConversationContext = [...activeChat.messages, userMessage];

    // Map your custom database message array format over to the structure your AI provider expects
    const apiFormattedMessages = fullConversationContext.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user', // Adjust if using Groq ('assistant' / 'user')
      parts: [{ text: msg.text }] // Gemini format structure layout shape
    }));

    let aiTextOutput = '';

    try {
      // Step E: Connect directly to your AI client interface stream layer.
      // (This example reflects the standard @google/genai SDK format)
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: apiFormattedMessages,
      });

      // Step F: Loop through chunks in real time and flush them to your frontend
      for await (const chunk of responseStream) {
        const chunkText = chunk.text || '';
        aiTextOutput += chunkText;

        // Formulate correct SSE compliant text protocol formats
        res.write(`data: ${JSON.stringify({ type: 'token', text: chunkText })}\n\n`);
      }

    } catch (apiError) {
      console.error("⚠️ Catching Upstream AI Pipeline Exception Gracefully:", apiError.message);

      const errorString = String(apiError.message || '');
      let fallbackText = "⚠️ An unexpected error disrupted the conversation generation loop.";

      if (apiError.status === 503 || apiError.status === 429 || errorString.includes('503') || errorString.includes('UNAVAILABLE')) {
        fallbackText = "⚠️ **Aura is under high load.** Spikes in traffic are temporary. Please try again in a moment.";
      }

      aiTextOutput += `\n\n${fallbackText}`;
      res.write(`data: ${JSON.stringify({ type: 'token', text: fallbackText })}\n\n`);
    }

    // Step G: Save the completed AI response bubble to your database
    const aiResponseBlock = {
      role: 'model',
      text: aiTextOutput
    };

    const isFirstMessagePair = activeChat.messages.length === 0;
    let updatedFields = {
      $push: { messages: aiResponseBlock },
      $set: { updatedAt: Date.now() }
    };

    // Generate a smart topic summary title if it's a completely new discussion thread
    if (isFirstMessagePair) {
      try {
        const smartTitle = await generateSmartTitle(userMessage.text);
        updatedFields.$set.title = smartTitle;
      } catch (titleErr) {
        console.warn("Failed to generate custom title:", titleErr.message);
      }
    }

    // Step H: Finalize MongoDB changes and retrieve the complete document state profile data
    const finalUpdatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: req.user.id },
      updatedFields,
      { returnDocument: 'after' }
    );

    // Step I: Send down final structural metadata object parameters to update state controls securely
    res.write(`data: ${JSON.stringify({ type: 'done', chat: finalUpdatedChat })}\n\n`);
    res.end(); // Safely terminate the open connection channel loop safely

  } catch (error) {
    console.error("❌ Critical System Failure in appendMessages execution root:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to process conversation loop iteration step.', error: error.message });
    }
  }
};

// 4. DELETE A SPECIFIC CHAT THREAD
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id;

    const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId: userId });

    if (!deletedChat) {
      return res.status(404).json({ message: 'Conversation not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    console.error("❌ Failed to delete chat:", error.message);
    res.status(500).json({ message: 'Failed to purge chat profile records.', error: error.message });
  }
};