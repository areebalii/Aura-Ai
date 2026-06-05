import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      {/* This is your default route. When you open http://localhost:5173/ 
        it will load the ChatPage component directly.
      */}
      <Route path="/" element={<ChatPage />} />

      {/* This is your Auth route for logging in and registering */}
      <Route path="/login" element={<LoginPage />} />

      {/* If a user types any weird URL, redirect them back to the chat */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}