import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import AuraLoader from './components/AuraLoader'; // Import the loader

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // This simulates the app booting up or verifying tokens.
    // Replace this timeout with your actual Auth/API check logic if needed.
    const bootTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 5000); 

    return () => clearTimeout(bootTimer);
  }, []);

  // Show the beautiful loader while the app is starting
  if (isInitializing) {
    return <AuraLoader />;
  }

  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}