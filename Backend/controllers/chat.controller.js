import Chat from '../models/chat.model.js';
import { generateAIResponse } from '../services/gemini.service.js';

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

// 3. LIVE UPGRADED APPEND & GENERATE CONTROLLER METHOD
export const appendMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messages } = req.body;

    // Step A: Pull matching context records from MongoDB first without altering them
    const activeChat = await Chat.findOne({ _id: chatId, userId: req.user.id });

    if (!activeChat) {
      return res.status(404).json({ message: 'Conversation profile context not found.' });
    }

    // Step B: Merge database history rows with incoming prompt values in local memory
    const fullConversationContext = [...activeChat.messages, ...messages];

    let aiTextOutput = '';

    try {
      // Step C: Securely request execution through the Google generation pipeline
      aiTextOutput = await generateAIResponse(fullConversationContext);
    } catch (apiError) {
      console.warn("⚠️ Catching Upstream AI Pipeline Exception Gracefully:", apiError.message);

      const errorString = String(apiError.message || '') + String(apiError.stack || '');

      // Step D Check: Look for explicit 503 high demand signals or status codes
      if (apiError.status === 503 || errorString.includes('503') || errorString.includes('UNAVAILABLE')) {
        aiTextOutput =
          "⚠️ **Aura is currently experiencing extremely high demand.**\n\n" +
          "The upstream Gemini engine returned a temporary server capacity warning (`503 Service Unavailable`). " +
          "Spikes in traffic are temporary. Please wait a few seconds and try resubmitting your prompt.";
      } else {
        aiTextOutput =
          "⚠️ **An unexpected error disrupted the conversation loop iteration.**\n\n" +
          "Failed to resolve response tokens safely through the active backend generation layer. Please try again.";
      }
    }

    // Step E: Construct the official response layout object matching your schema profile
    const aiResponseBlock = {
      role: 'model',
      text: aiTextOutput
    };

    // Step F: Atomic Database Push - Insert BOTH messages at the exact same millisecond mark
    const finalUpdatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: req.user.id },
      {
        $push: { messages: { $each: [...messages, aiResponseBlock] } },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    );

    return res.status(200).json(finalUpdatedChat);

  } catch (error) {
    console.error("❌ Critical System Failure in appendMessages execution root:", error.message);
    res.status(500).json({ message: 'Failed to process conversation loop iteration step.', error: error.message });
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