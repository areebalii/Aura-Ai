import 'dotenv/config';

import Chat from '../models/chat.model.js';
import { generateSmartTitle } from '../services/gemini.service.js';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import Groq from 'groq-sdk';

export const createChat = async (req, res) => {
  try {
    const newChat = await Chat.create({
      userId: req.user.id || req.user._id,
      title: req.body.title || 'New Conversation',
      messages: []
    });
    res.status(201).json(newChat);
  } catch (error) {
    res.status(400).json({ message: 'Failed to initialize chat thread.', error: error.message });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve history indexes.', error: error.message });
  }
};

export const appendMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messages, model, media } = req.body;
    const userMessage = messages[0];

    const activeChat = await Chat.findOne({ _id: chatId, userId: req.user.id });
    if (!activeChat) {
      return res.status(404).json({ message: 'Conversation profile context not found.' });
    }

    const persistedUserMsg = {
      role: 'user',
      text: userMessage.text,
      mediaContext: media ? {
        name: media.name,
        type: media.type,
        url: `data:${media.type};base64,${media.base64}`
      } : null
    };

    await Chat.updateOne(
      { _id: chatId, userId: req.user.id },
      { $push: { messages: persistedUserMsg } }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const fullConversationContext = [...activeChat.messages, persistedUserMsg];
    let aiTextOutput = '';

    const formatGeminiMessages = () => fullConversationContext.map((msg, idx) => {
      const isCurrentPrompt = idx === fullConversationContext.length - 1;
      const partsArray = [{ text: msg.text }];
      if (isCurrentPrompt && media) {
        partsArray.push({ inlineData: { mimeType: media.type, data: media.base64 } });
      }
      return { role: msg.role === 'model' ? 'model' : 'user', parts: partsArray };
    });

    if (model.startsWith('gemini')) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let streamTargetModel = model || 'gemini-2.5-flash';

      try {
        const responseStream = await ai.models.generateContentStream({
          model: streamTargetModel,
          contents: formatGeminiMessages(),
        });

        for await (const chunk of responseStream) {
          const chunkText = chunk.text || '';
          aiTextOutput += chunkText;
          res.write(`data: ${JSON.stringify({ type: 'token', text: chunkText })}\n\n`);
        }
      } catch (err) {
        console.error("⚠️ Gemini Exception:", err.message);
        aiTextOutput = await runGroqBackupPipeline(fullConversationContext, res, aiTextOutput, media);
      }
    } else if (model.startsWith('grok') || model.startsWith('groq')) {
      try {
        const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const groqFormattedMessages = fullConversationContext.map((msg, idx) => {
          const isCurrentPrompt = idx === fullConversationContext.length - 1;
          if (media && isCurrentPrompt && media.type.startsWith('image/')) {
            return {
              role: msg.role === 'model' ? 'assistant' : 'user',
              content: [
                { type: 'text', text: msg.text || "Analyze this image." },
                { type: 'image_url', image_url: { url: `data:${media.type};base64,${media.base64}` } }
              ]
            };
          }
          return { role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text };
        });

        groqFormattedMessages.unshift({
          role: 'system',
          content: "You are Aura. Structure outputs with Markdown headers, lists, bold text, and code blocks."
        });

        const targetModel = (media && media.type.startsWith('image/')) ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

        const groqStream = await groqClient.chat.completions.create({
          model: targetModel,
          messages: groqFormattedMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        });

        for await (const chunk of groqStream) {
          const deltaText = chunk.choices[0]?.delta?.content || '';
          if (deltaText) {
            aiTextOutput += deltaText;
            res.write(`data: ${JSON.stringify({ type: 'token', text: deltaText })}\n\n`);
          }
        }
      } catch (groqError) {
        console.error("❌ Groq Pipeline exception:", groqError.message);
        res.write(`data: ${JSON.stringify({ type: 'token', text: `\n\n⚠️ Groq Connection error: ${groqError.message}` })}\n\n`);
      }
    }

    // Persist final state and generate title if it's the first exchange
    const aiResponseBlock = { role: 'model', text: aiTextOutput };
    const isFirstMessagePair = activeChat.messages.length === 0;

    let updateData = {
      $push: { messages: aiResponseBlock },
      $set: { updatedAt: Date.now() }
    };

    if (isFirstMessagePair) {
      try {
        const smartTitle = await generateSmartTitle(userMessage.text);
        if (smartTitle) updateData.$set.title = smartTitle;
      } catch (titleErr) {
        console.warn("Title generation failed:", titleErr.message);
      }
    }

    const finalUpdatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: req.user.id },
      updateData,
      { returnDocument: 'after' }
    );

    res.write(`data: ${JSON.stringify({ type: 'done', chat: finalUpdatedChat })}\n\n`);
    res.end();
  } catch (error) {
    console.error("❌ Critical System Failure:", error.message);
    if (!res.headersSent) res.status(500).json({ message: 'Internal Server Error.' });
  }
};

// ========================================================
// 🛡️ REDUNDANT ULTIMATE CROSS-PROVIDER FAILOVER PIPELINE
// ========================================================
const runGroqBackupPipeline = async (context, res, currentOutput, media) => {
  res.write(`data: ${JSON.stringify({ type: 'token', text: "\n\n⚠️ *[All Gemini nodes rate-limited. Activating Groq LPU cluster redundancy...]* \n\n" })}\n\n`);

  try {
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const groqFormattedMessages = context.map((msg, idx) => {
      const isCurrentPrompt = idx === context.length - 1;
      if (media && isCurrentPrompt && media.type.startsWith('image/')) {
        return {
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: [
            { type: 'text', text: msg.text || "Analyze this image." },
            { type: 'image_url', image_url: { url: `data:${media.type};base64,${media.base64}` } }
          ]
        };
      }
      return { role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text };
    });

    groqFormattedMessages.unshift({
      role: 'system',
      content:
        "You are Aura, an elite, ultra-responsive conversational AI assistant. " +
        "CRITICAL DESIGN DIRECTIVE: You must structure your outputs beautifully for an elegant dark-theme web UI. " +
        "Never return dense walls of plain text paragraphs. Always organize your knowledge using structured Markdown layout schemas."
    });

    const targetModel = (media && media.type.startsWith('image/')) ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

    const groqStream = await groqClient.chat.completions.create({
      model: targetModel,
      messages: groqFormattedMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096
    });

    let appendedText = currentOutput;
    for await (const chunk of groqStream) {
      const deltaText = chunk.choices[0]?.delta?.content || '';
      if (deltaText) {
        appendedText += deltaText;
        res.write(`data: ${JSON.stringify({ type: 'token', text: deltaText })}\n\n`);
      }
    }
    return appendedText;

  } catch (err) {
    console.error("❌ Cross-provider failover system exhausted:", err.message);
    res.write(`data: ${JSON.stringify({ type: 'token', text: "\n\n❌ All AI infrastructure cores are temporarily over-capacity. Please try again in a minute." })}\n\n`);
    return currentOutput + "\n\n[All Infrastructure Cores Exhausted]";
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id;
    const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId: userId });
    if (!deletedChat) return res.status(404).json({ message: 'Conversation not found or unauthorized.' });
    res.status(200).json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to purge chat profile records.', error: error.message });
  }
};