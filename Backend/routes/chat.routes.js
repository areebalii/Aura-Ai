import express from 'express';
import { createChat, getUserChats, appendMessages, deleteChat } from '../controllers/chat.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// All chat operations require a verified token
router.post('/new', verifyToken, createChat);
router.get('/history', verifyToken, getUserChats);
router.put('/:chatId/append', verifyToken, appendMessages);
router.delete('/:chatId', verifyToken, deleteChat);

export default router;