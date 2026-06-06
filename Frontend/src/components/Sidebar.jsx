import { useNavigate } from 'react-router-dom';

export default function Sidebar({
  isLoading,
  chatHistory,
  onNewChat,
  user,
  onLogout,
  activeChatId,
  onSelectChat,
  onClose,
  onDeleteChat
}) {
  const navigate = useNavigate();

  // Skeleton UI for the loading state
  const SkeletonItem = () => (
    <div className="w-full h-[46px] bg-[#2a2b2d]/20 rounded-xl animate-pulse mb-1 border border-[#2d2f31]" />
  );

  return (
    <aside className="w-64 bg-[#1e1f20] p-4 flex flex-col justify-between h-full border-r border-[#2d2f31] relative">
      <div>
        {/* Header Action Row */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={onNewChat}
            className="flex-1 bg-[#2a2b2d] hover:bg-[#333537] text-sm font-medium py-3 px-4 rounded-full flex items-center justify-center gap-3 transition-all text-gray-200 shadow-md"
          >
            <span>➕</span> New Chat
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2.5 hover:bg-[#2a2b2d] rounded-full text-gray-400 hover:text-white transition-all focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* History List Container Track */}
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[65vh] custom-sidebar-scrollbar">
          <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider">
            {isLoading ? 'Loading...' : 'Recent Conversations'}
          </p>

          {isLoading ? (
            // Render Skeleton items while fetching
            <div className="flex flex-col gap-1">
              {[...Array(6)].map((_, i) => <SkeletonItem key={i} />)}
            </div>
          ) : chatHistory.length === 0 ? (
            // Render Empty state
            <p className="text-xs text-gray-600 px-3 italic py-2">No recent chats</p>
          ) : (
            // Render Actual list
            chatHistory.map((chat) => (
              <div
                key={chat._id}
                className={`group w-full flex items-center justify-between text-sm rounded-xl transition-all text-gray-300 ${activeChatId === chat._id
                  ? 'bg-[#2a2b2d] font-medium text-white border-l-4 border-blue-500'
                  : 'hover:bg-[#2a2b2d]/40 hover:text-gray-100'
                  }`}
              >
                <button
                  onClick={() => onSelectChat(chat)}
                  className={`flex-1 text-left py-2.5 px-3 truncate flex items-center gap-2.5 min-w-0 ${activeChatId === chat._id ? 'pl-2' : ''
                    }`}
                >
                  <span className="shrink-0 text-xs opacity-70">💬</span>
                  <span className="truncate">{chat.title || 'New Conversation'}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Are you sure you want to delete this chat?")) {
                      onDeleteChat(chat._id);
                    }
                  }}
                  className="p-1.5 mr-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0"
                  title="Delete Chat"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Profile Info Layer Footer */}
      <div className="border-t border-[#2d2f31] pt-4 bg-[#1e1f20]">
        {user ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 p-2.5 text-sm text-gray-200 font-medium bg-[#2a2b2d]/30 rounded-xl border border-[#2d2f31]/40">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold shadow-sm shrink-0">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="truncate pr-1">{user.fullName}</span>
            </div>
            <button
              onClick={onLogout}
              className="w-full text-left text-xs font-medium p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2 pl-3"
            >
              <span>🚪</span> Log Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full text-left text-sm font-medium p-3 rounded-xl hover:bg-[#2a2b2d] flex items-center gap-3 text-gray-300 transition-all border border-transparent hover:border-[#2d2f31]"
          >
            <span className="text-base opacity-80">👤</span> Sign In / Sign Up
          </button>
        )}
      </div>
    </aside>
  );
}