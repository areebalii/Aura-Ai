import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Sidebar from '../components/Sidebar';
import AuthModal from '../components/AuthModal';
import API from '../api/axios.instance';

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [guestQuestionCount, setGuestQuestionCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Responsive state for the mobile sidebar drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [chatHistory, setChatHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hello! I am Aura. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const localUser = localStorage.getItem('aura_user');
    const localToken = localStorage.getItem('aura_token');

    if (localUser && localToken) {
      const parsedUser = JSON.parse(localUser);
      setUser(parsedUser);
      setMessages([{ role: 'model', text: `Welcome back, ${parsedUser.fullName}! I am Aura. How can I help you build today?` }]);
      fetchChatHistory();
    }
  }, []);

  // 1. UPDATE YOUR FETCH HISTORY (To read the saved ID upon browser loading)
  const fetchChatHistory = async () => {
    try {
      const response = await API.get('/chat/history');
      setChatHistory(response.data);

      // Check if there's a saved chat ID from before the page reload
      const savedChatId = localStorage.getItem('aura_active_chat_id');

      if (savedChatId && response.data.length > 0) {
        // Find the chat object inside your freshly loaded history array
        const matchingChat = response.data.find(chat => chat._id === savedChatId);

        if (matchingChat) {
          setActiveChat(matchingChat);
          if (matchingChat.messages && matchingChat.messages.length > 0) {
            setMessages(matchingChat.messages);
          }
        }
      }
    } catch (err) {
      console.error("Error collecting chat analytics:", err);
    }
  };

  // 2. UPDATE SELECT CHAT (Save the selected chat ID to storage)
  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setIsSidebarOpen(false);

    // Save to localStorage so a reload stays on this thread
    localStorage.setItem('aura_active_chat_id', chat._id);

    if (chat.messages && chat.messages.length > 0) {
      setMessages(chat.messages);
    } else {
      setMessages([{ role: 'model', text: `Loaded thread: "${chat.title}". Send a message to start conversing.` }]);
    }
  };

  // 3. UPDATE SEND HANDLER (Save the ID when a brand new thread gets created)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!user && guestQuestionCount >= 2) {
      setIsModalOpen(true);
      return;
    }

    const userPrompt = input;
    const userMessage = { role: 'user', text: userPrompt };
    const currentMessages = [...messages, userMessage];

    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    if (!user) {
      setGuestQuestionCount(prev => prev + 1);
      simulateAIReply(currentMessages, userPrompt);
    } else {
      try {
        let currentChatId = activeChat?._id;

        if (!activeChat) {
          // If it's a brand new chat, generate it via backend
          const newChatResponse = await API.post('/chat/new', { title: userPrompt.substring(0, 24) + '...' });
          currentChatId = newChatResponse.data._id;

          // Save the brand new chat ID to storage instantly
          localStorage.setItem('aura_active_chat_id', currentChatId);
        }

        const response = await API.put(`/chat/${currentChatId}/append`, { messages: [userMessage] });

        setMessages(response.data.messages);
        setActiveChat(response.data);
        fetchChatHistory();

      } catch (err) {
        console.error("Failed to sync message pipeline:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 4. UPDATE NEW CHAT (Clear the storage value so it knows to start blank)
  const handleNewChat = () => {
    setActiveChat(null);
    setIsSidebarOpen(false);

    // Clear the active ID out of storage for a fresh layout slate
    localStorage.removeItem('aura_active_chat_id');

    setMessages([{ role: 'model', text: 'Started a brand new conversation. Ask away!' }]);
  };

  // 5. UPDATE LOGOUT AND DELETE HANDLERS (To completely scrub the storage key)
  const handleLogout = () => {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    localStorage.removeItem('aura_active_chat_id'); // Clear on logout
    setUser(null);
    setActiveChat(null);
    setChatHistory([]);
    setGuestQuestionCount(0);
    setIsSidebarOpen(false);
    setMessages([{ role: 'model', text: 'Hello! I am Aura. How can I help you today?' }]);
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await API.delete(`/chat/${chatId}`);
      setChatHistory((prevHistory) => prevHistory.filter((chat) => chat._id !== chatId));

      if (activeChat?._id === chatId) {
        // If the currently viewed chat was just deleted, clear it out of memory
        localStorage.removeItem('aura_active_chat_id');
        setActiveChat(null);
        setMessages([{ role: 'model', text: 'Hello! I am Aura. How can I help you today?' }]);
      }
    } catch (err) {
      console.error("❌ Failed to delete conversation thread track:", err);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#131314] text-[#e3e3e3] overflow-hidden relative">

      {/* Dimmed mobile backdrop overlay wrapper */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fadeIn"
        />
      )}

      {/* Responsive Sidebar container shell wrapper wrapper tracking state styles */}
      <div className={`fixed md:static inset-y-0 left-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out h-full`}>
        <Sidebar
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
          user={user}
          onLogout={handleLogout}
          activeChatId={activeChat?._id}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col justify-between relative h-full w-full min-w-0">
        {/* Top Header holding the Hamburger Navigation element */}
        <header className="p-4 flex justify-between items-center bg-[#131314]/80 backdrop-blur-md border-b border-[#2d2f31]">
          <div className="flex items-center gap-3">
            {/* Hamburger Button element - Only visible on screens smaller than md tailwind width breakpoints */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-[#202123] active:bg-[#2d2f31] rounded-xl text-gray-400 hover:text-white transition-all focus:outline-none"
              aria-label="Toggle navigation menu panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-200">Aura AI</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#2a2b2d] px-2 py-1 rounded text-gray-400">
              {user ? `⚡ ${user.fullName}` : `Guest Uses Left: ${Math.max(0, 2 - guestQuestionCount)}`}
            </span>
          </div>
        </header>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl w-full mx-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-md text-white shrink-0">
                  A
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all ${msg.role === 'user'
                ? 'bg-[#2b2c2e] text-white rounded-br-none'
                : 'bg-transparent text-gray-200 sequential-markdown-layout'
                }`}>

                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed space-y-2.5">
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2 text-white border-b border-[#2d2f31] pb-1" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-4 mb-1.5 text-gray-100" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-3 mb-1 text-gray-200" {...props} />,
                        p: ({ node, ...props }) => <p className="text-gray-300 mb-2.5 leading-relaxed" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2 space-y-1 text-gray-300" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2 space-y-1 text-gray-300" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-0.5" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-blue-400" {...props} />,
                        code: ({ node, inline, ...props }) => inline
                          ? <code className="bg-[#2d2f31] px-1.5 py-0.5 rounded font-mono text-xs text-pink-400" {...props} />
                          : <pre className="bg-[#1e1f20] p-4 rounded-xl overflow-x-auto my-3 border border-[#2d2f31] font-mono text-xs text-emerald-400 shadow-inner" {...props} />
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4 justify-start items-start animate-fadeIn">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-md text-white">
                A
              </div>
              <div className="bg-[#1e1f20] border border-[#2d2f31] rounded-2xl rounded-bl-none px-5 py-4 text-sm text-gray-400 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 max-w-3xl w-full mx-auto">
          <form onSubmit={handleSend} className="relative flex items-center bg-[#1e1f20] rounded-full border border-[#2d2f31] focus-within:border-[#4b5563] px-4 py-3 shadow-lg">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={(!user && guestQuestionCount >= 2) || loading}
              placeholder={
                loading
                  ? "Aura is conceptualizing..."
                  : (!user && guestQuestionCount >= 2)
                    ? "Please log in to continue..."
                    : "Message Aura..."
              }
              className="w-full bg-transparent text-sm focus:outline-none pr-12 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={(!user && guestQuestionCount >= 2) || loading || !input.trim()}
              className="absolute right-3 bg-[#2a2b2d] hover:bg-[#383a3c] p-2 rounded-full transition-all text-xs disabled:opacity-40 text-gray-300"
            >
              ➔
            </button>
          </form>
          <p className="text-[11px] text-center text-gray-500 mt-2">
            Aura can make mistakes. Verify important info.
          </p>
        </div>
      </main>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}