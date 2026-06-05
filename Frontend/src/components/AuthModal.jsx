import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    // Fixed viewport lock configuration to block background scrolling when open
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
      {/* Outer bounding click interceptor shell */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Container Card */}
      <div className="max-w-md w-full bg-[#1e1f20] rounded-2xl p-6 md:p-8 border border-[#2d2f31] shadow-2xl text-center relative z-10 transform transition-all animate-scaleUp">

        {/* Top Floating Close Handle Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-300 p-1 hover:bg-[#2a2b2d] rounded-full transition-all"
          aria-label="Dismiss modal warning layout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Decorative AI Icon */}
        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xl font-bold shadow-lg text-white">
          A
        </div>

        <h3 className="text-xl md:text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          You've Hit the Free Limit!
        </h3>

        <p className="text-sm text-gray-400 mb-6 leading-relaxed px-1">
          Guests can ask up to 2 questions. Sign in or create an account to unlock unlimited answers, smarter models, and persistent chat history.
        </p>

        {/* Call To Action Buttons Group */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all text-sm shadow-md active:scale-[0.98]"
          >
            Sign In / Sign Up
          </button>

          <button
            onClick={onClose}
            className="w-full bg-[#2a2b2d] hover:bg-[#333537] text-gray-300 font-medium py-3 rounded-xl transition-all text-sm border border-[#2d2f31]/60"
          >
            Just Looking Around
          </button>
        </div>
      </div>
    </div>
  );
}