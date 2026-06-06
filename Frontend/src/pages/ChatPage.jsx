import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Sidebar from '../components/Sidebar';
import AuthModal from '../components/AuthModal';
import API from '../api/axios.instance';

const animationStyles = `
  @keyframes slideUpFade {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-chat-entry {
    animation: slideUpFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

function CodeBlockWrapper({ children, className, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const rawCode = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code to clipboard:", err);
    }
  };

  return (
    <div className="relative group/code my-5 rounded-xl overflow-hidden border border-[#2d2f31] shadow-xl">
      <div className="flex justify-between items-center px-4 py-2 bg-[#18191a] text-xs text-gray-400 select-none border-b border-[#2d2f31]/60">
        <span className="font-mono tracking-wider text-[10px] uppercase font-semibold text-gray-500">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white transition-colors bg-[#2a2b2d] hover:bg-[#333537] px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 active:scale-95 border border-[#3c3e41]"
        >
          {copied ? '✅ Copied!' : '📋 Copy Code'}
        </button>
      </div>
      <div className="text-xs font-mono">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: '#1e1f20',
            fontSize: '0.85rem',
            lineHeight: '1.5',
          }}
          {...props}
        >
          {rawCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [guestQuestionCount, setGuestQuestionCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hello! I am Aura. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const wordQueueRef = useRef([]);
  const playbackIntervalRef = useRef(null);
  const streamFinishedRef = useRef(false);
  const currentMessageTextRef = useRef('');

  useEffect(() => {
    const localUser = localStorage.getItem('aura_user');
    const localToken = localStorage.getItem('aura_token');

    if (localUser && localToken) {
      const parsedUser = JSON.parse(localUser);
      setUser(parsedUser);
      setMessages([{ role: 'model', text: `Welcome back, ${parsedUser.fullName}! I am Aura. How can I help you build today?` }]);
      fetchChatHistory();
    }

    return () => clearInterval(playbackIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!isStreaming && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const fetchChatHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const response = await API.get('/chat/history');
      setChatHistory(response.data);

      const savedChatId = localStorage.getItem('aura_active_chat_id');
      if (savedChatId && response.data.length > 0) {
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
    } finally { 
      setIsHistoryLoading(false); 
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setIsSidebarOpen(false);
    localStorage.setItem('aura_active_chat_id', chat._id);

    if (chat.messages && chat.messages.length > 0) {
      setMessages(chat.messages);
    } else {
      setMessages([{ role: 'model', text: `Loaded thread: "${chat.title}". Send a message to start conversing.` }]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file context! Please upload an image (JPEG/PNG/WebP) or a PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: reader.result.split(',')[1]
      });
      setFilePreview(file.type.startsWith('image/') ? reader.result : 'pdf-icon');
    };
    reader.readAsDataURL(file);
  };

  const clearAttachedFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startPlaybackEngine = () => {
    clearInterval(playbackIntervalRef.current);
    currentMessageTextRef.current = '';
    streamFinishedRef.current = false;
    wordQueueRef.current = [];

    playbackIntervalRef.current = setInterval(() => {
      if (wordQueueRef.current.length > 0) {
        const nextSegment = wordQueueRef.current.shift();
        currentMessageTextRef.current += nextSegment;

        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'model') {
            updated[lastIndex].text = currentMessageTextRef.current;
          }
          return updated;
        });

        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        });
      } else if (streamFinishedRef.current) {
        clearInterval(playbackIntervalRef.current);
        setIsStreaming(false);
      }
    }, 30);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() && !attachedFile) return;
    if (loading || isStreaming) return;

    if (!user && guestQuestionCount >= 2) {
      setIsModalOpen(true);
      return;
    }

    const userPrompt = input;
    const userMessage = {
      role: 'user',
      text: userPrompt,
      mediaContext: attachedFile ? { name: attachedFile.name, type: attachedFile.type, url: filePreview } : null
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const contextMediaPayload = attachedFile;
    clearAttachedFile();
    setLoading(true);

    if (!user) {
      setGuestQuestionCount(prev => prev + 1);
      simulateAIReply([...messages, userMessage], userPrompt);
    } else {
      try {
        let currentChatId = activeChat?._id;

        if (!activeChat) {
          const newChatResponse = await API.post('/chat/new', { title: 'Generating Topic...' });
          currentChatId = newChatResponse.data._id;
          localStorage.setItem('aura_active_chat_id', currentChatId);
          setActiveChat(newChatResponse.data);
        }

        setMessages(prev => [...prev, { role: 'model', text: '' }]);
        setLoading(false);
        setIsStreaming(true);

        startPlaybackEngine();

        const token = localStorage.getItem('aura_token');
        const response = await fetch(`${API.defaults.baseURL || ''}/chat/${currentChatId}/append`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', text: userPrompt }],
            model: selectedModel,
            media: contextMediaPayload
          })
        });

        if (!response.ok) throw new Error('Streaming connection pipeline failed.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let chunkBuffer = '';
        let wordAccumulator = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          chunkBuffer += decoder.decode(value, { stream: true });
          const lines = chunkBuffer.split('\n');
          chunkBuffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith('data: ')) continue;

            const rawJson = cleanLine.slice(6);
            if (rawJson === '[DONE]') break;

            try {
              const parsedData = JSON.parse(rawJson);

              if (parsedData.type === 'token') {
                const tokenText = parsedData.text;
                for (let char of tokenText) {
                  wordAccumulator += char;
                  if (char === ' ' || char === '\n' || wordAccumulator.length >= 8) {
                    wordQueueRef.current.push(wordAccumulator);
                    wordAccumulator = '';
                  }
                }
              } else if (parsedData.type === 'done') {
                // The server returns the updated chat including all messages
                setActiveChat(parsedData.chat);

                setMessages(parsedData.chat.messages);

                fetchChatHistory();
              }
            } catch (err) {
              console.warn("Error parsing incoming SSE layout packet line context:", err);
            }
          }
        }

        if (wordAccumulator.length > 0) {
          wordQueueRef.current.push(wordAccumulator);
        }
        streamFinishedRef.current = true;

      } catch (err) {
        console.error("Failed to sync message pipeline:", err);
        clearInterval(playbackIntervalRef.current);
        setLoading(false);
        setIsStreaming(false);
        setMessages(prev => [
          ...prev,
          { role: 'model', text: '⚠️ **Connection lost.** Failed to process the text stream.' }
        ]);
      }
    }
  };

  const simulateAIReply = (currentMessages, userPrompt) => {
    setTimeout(() => {
      setMessages([
        ...currentMessages,
        { role: 'model', text: `Guest execution echo response to: "${userPrompt}".` }
      ]);
      setLoading(false);
      if (guestQuestionCount === 1) {
        setTimeout(() => setIsModalOpen(true), 1000);
      }
    }, 800);
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setIsSidebarOpen(false);
    localStorage.removeItem('aura_active_chat_id');
    setMessages([{ role: 'model', text: 'Started a brand new conversation. Ask away!' }]);
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    localStorage.removeItem('aura_active_chat_id');
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
      <style>{animationStyles}</style>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden" />
      )}

      <div className={`fixed md:static inset-y-0 left-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out h-full`}>
        <Sidebar
          isLoading={isHistoryLoading} 
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
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
        <header className="p-4 flex justify-between items-center bg-[#131314]/80 backdrop-blur-md border-b border-[#2d2f31]">
          <div className="flex items-center gap-3">
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

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="ml-2 bg-[#1e1f20] border border-[#2d2f31] rounded-xl px-3 py-1 text-xs font-medium text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
            >
              <option value="gemini-2.5-flash">✨ Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">🧠 Gemini 2.5 Pro</option>
              <option value="groq-2">⚡ Grok / Llama Cluster</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#2a2b2d] px-2 py-1 rounded text-gray-400">
              {user ? `⚡ ${user.fullName}` : `Guest Uses Left: ${Math.max(0, 2 - guestQuestionCount)}`}
            </span>
          </div>
        </header>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl w-full mx-auto scrollbar-thin scroll-smooth">
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;

            return (
              <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-chat-entry`}>
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-md text-white shrink-0">
                    A
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all shadow-sm ${msg.role === 'user'
                  ? 'bg-[#2b2c2e] text-white rounded-br-none'
                  : 'bg-transparent text-gray-200'
                  }`}>
                  {msg.role === 'user' ? (
                    <div className="space-y-2">
                      {msg.mediaContext && (
                        <div className="mb-2 max-w-[200px] rounded-lg overflow-hidden border border-[#3c3e41]">
                          {msg.mediaContext.url === 'pdf-icon' ? (
                            <div className="bg-[#1e1f20] p-3 flex items-center gap-2 text-xs text-gray-300">
                              <span>📄</span>
                              <span className="truncate font-mono">{msg.mediaContext.name}</span>
                            </div>
                          ) : (
                            <img src={msg.mediaContext.url} alt="Uploaded attachment context snippet" className="w-full object-cover max-h-[150px]" />
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
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
                          code: ({ node, inline, className, ...props }) => inline
                            ? <code className="bg-[#2d2f31] px-1.5 py-0.5 rounded font-mono text-xs text-pink-400" {...props} />
                            : <CodeBlockWrapper className={className} {...props} />,
                          img: ({ node, ...props }) => (
                            <div className="my-4 rounded-xl overflow-hidden border border-[#2d2f31] max-w-xl shadow-lg">
                              <img className="w-full object-cover h-auto max-h-[400px]" loading="lazy" {...props} alt={props.alt || "AI Graphic Asset"} />
                            </div>
                          )
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {isLastMessage && isStreaming && (
                        <span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse rounded-full align-middle" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4 justify-start items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-md text-white">A</div>
              <div className="bg-[#1e1f20] border border-[#2d2f31] rounded-2xl rounded-bl-none px-5 py-4 text-sm text-gray-400 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 max-w-3xl w-full mx-auto space-y-2">
          {filePreview && (
            <div className="flex items-center gap-3 bg-[#1e1f20] border border-[#2d2f31] p-2.5 rounded-xl max-w-xs animate-chat-entry relative group">
              {filePreview === 'pdf-icon' ? (
                <div className="w-10 h-10 bg-[#2b2c2e] rounded-lg flex items-center justify-center text-lg">📄</div>
              ) : (
                <img src={filePreview} alt="Upload thumb track" className="w-10 h-10 object-cover rounded-lg border border-[#3c3e41]" />
              )}
              <div className="flex-1 min-w-0 text-xs">
                <p className="text-gray-300 font-medium truncate">{attachedFile?.name}</p>
                <p className="text-gray-500 uppercase font-mono tracking-tighter text-[9px]">{attachedFile?.type.split('/')[1]}</p>
              </div>
              <button
                type="button"
                onClick={clearAttachedFile}
                className="bg-black/50 hover:bg-red-500/80 text-white rounded-full p-1 transition-colors text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="relative flex items-end bg-[#1e1f20] rounded-2xl border border-[#2d2f31] focus-within:border-[#4b5563] pl-12 pr-12 py-3 shadow-lg">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isStreaming}
              className="absolute left-3 bottom-2.5 bg-[#2a2b2d] hover:bg-[#383a3c] p-2 rounded-full transition-all text-sm text-gray-400 hover:text-white disabled:opacity-40 h-8 w-8 flex items-center justify-center active:scale-95"
            >
              📎
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if ((input.trim() || attachedFile) && !loading && !isStreaming) {
                    handleSend(e);
                  }
                }
              }}
              disabled={(!user && guestQuestionCount >= 2) || loading || isStreaming}
              placeholder={
                loading || isStreaming
                  ? "Aura is conceptualizing..."
                  : (!user && guestQuestionCount >= 2)
                    ? "Please log in to continue..."
                    : "Message Aura... (Shift + Enter for new line)"
              }
              className="w-full bg-transparent text-sm focus:outline-none text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-[200px] py-0.5 scrollbar-none"
            />

            <button
              type="submit"
              disabled={(!user && guestQuestionCount >= 2) || loading || isStreaming || (!input.trim() && !attachedFile)}
              className="absolute right-3 bottom-2.5 bg-[#2a2b2d] hover:bg-[#383a3c] p-2 rounded-full transition-all text-xs disabled:opacity-40 text-gray-300 grid place-items-center h-8 w-8 active:scale-95"
            >
              ➔
            </button>
          </form>
          <p className="text-[11px] text-center text-gray-500 mt-2">Aura can make mistakes. Verify important info.</p>
        </div>
      </main>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}