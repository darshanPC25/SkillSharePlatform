import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Search, Send, User, MessageSquare, Plus, Paperclip, File as FileIcon, Loader2 } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { useNotificationContext } from '../context/NotificationContext';


export function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { openChatPopup, addPopupMessage, popupRoom } = useNotificationContext();

  // We need a ref to messages so handleNewMessage can always access the
  // latest snapshot without causing re-render loops or TDZ errors.
  const messagesRef = useRef([]);

  // Declare the WS hook early so `messages` is available.
  // handleNewMessage is wired in via the onNewMessageRef inside the hook,
  // so forward-declaring with a ref is safe.
  const handleNewMessageRef = useRef(null);
  const { messages, setMessages, isConnected, sendMessage } = useChatWebSocket(
    activeRoom?.name,
    { onNewMessage: (msg) => handleNewMessageRef.current?.(msg) }
  );

  // Keep messagesRef in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const handleNewMessage = useCallback((msg) => {
    // Don't show popup for own messages
    if (msg.sender_username === currentUser?.username) return;

    // If the popup is already open for THIS room, just append the message
    if (popupRoom?.name === activeRoom?.name) {
      addPopupMessage(msg);
      return;
    }

    // Otherwise open / switch the popup to this room with recent messages
    openChatPopup(activeRoom, messagesRef.current.slice(-20));
  }, [currentUser, activeRoom, popupRoom, openChatPopup, addPopupMessage]);

  // Keep the ref to handleNewMessage up to date
  useEffect(() => { handleNewMessageRef.current = handleNewMessage; }, [handleNewMessage]);


  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const base = API_BASE_URL.replace('/api/', '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  };

  // Fetch initial profile & chat list
  useEffect(() => {
    api.get('users/me/').then(res => setCurrentUser(res.data)).catch(console.error);
    fetchChats();
  }, []);

  const fetchChats = () => {
    api.get('chat/').then(res => setChats(res.data)).catch(console.error);
  };

  // Fetch historical messages when active room changes
  useEffect(() => {
    if (activeRoom) {
      api.get(`chat/room/${activeRoom.name}/`)
        .then(res => setMessages(res.data))
        .catch(console.error);
    }
  }, [activeRoom, setMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Search
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const delayDebounce = setTimeout(() => {
      setIsSearching(true);
      api.get(`chat/users/search/?q=${searchQuery}`)
        .then(res => setSearchResults(res.data))
        .finally(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleStartChat = async (userId) => {
    try {
      const res = await api.post(`chat/start/${userId}/`);
      setSearchQuery('');
      setSearchResults([]);
      setActiveRoom(res.data);
      fetchChats(); // Refresh list to bump it or show new
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
      fetchChats(); // trigger refresh to update unread/latest
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeRoom) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      await api.post(`chat/room/${activeRoom.name}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // The WebSocket will broadcast the message, so we don't need to manually append it
      fetchChats();
    } catch (err) {
      console.error(err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-100px)] max-h-[800px] flex gap-6">
      
      {/* Left Pane - Chat List */}
      <GlassCard className="w-1/3 flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold tracking-widest text-white">COMMS HUB</h2>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ea580c]/30 to-red-900/30 flex items-center justify-center text-[#ea580c]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Locate user..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="tech-input w-full pl-9 h-10 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence>
            {searchQuery ? (
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 text-xs font-semibold text-[#ea580c] tracking-widest uppercase mb-2">Network Search Array</div>
                {isSearching ? (
                  <div className="text-center text-gray-500 text-sm py-4">Scanning...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <button 
                      key={u.id}
                      onClick={() => handleStartChat(u.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center font-display text-[#ea580c] border border-white/10 group-hover:border-[#ea580c]/50 transition-colors overflow-hidden">
                        {u.profile_picture ? <img src={getMediaUrl(u.profile_picture)} className="w-full h-full object-cover" /> : u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-white text-sm font-medium truncate">{u.first_name ? `${u.first_name} ${u.last_name}` : u.username}</div>
                        <div className="text-gray-500 text-xs truncate">@{u.username}</div>
                      </div>
                      <Plus className="w-4 h-4 text-gray-600 group-hover:text-[#ea580c] transition-colors" />
                    </button>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">No users found in grid.</div>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {chats.length > 0 ? chats.map(room => {
                  const isActive = activeRoom?.id === room.id;
                  const otherUser = room.other_user;
                  return (
                    <button 
                      key={room.id}
                      onClick={() => setActiveRoom(room)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isActive ? 'bg-gradient-to-r from-[#ea580c]/20 to-transparent border-l-2 border-[#ea580c]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center font-display text-white border border-white/5 overflow-hidden flex-shrink-0">
                        {otherUser?.profile_picture ? <img src={getMediaUrl(otherUser.profile_picture)} className="w-full h-full object-cover" /> : otherUser?.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-white text-sm font-medium truncate">{otherUser?.first_name ? `${otherUser.first_name} ${otherUser.last_name}` : otherUser?.username}</div>
                        <div className={`text-xs truncate ${isActive ? 'text-[#ea580c]' : 'text-gray-500'}`}>
                          {room.latest_message ? room.latest_message.content : 'No messages yet'}
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="text-center text-gray-500 text-sm py-10 px-4">
                    <User className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    No active comms. Search grid above to initialize.
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Right Pane - Chat Window */}
      <GlassCard className="flex-1 flex flex-col relative overflow-hidden">
        {activeRoom ? (
          <>
            {/* Chat Target Header */}
            <div className="h-16 border-b border-white/5 flex items-center px-6 gap-4 bg-black/20 shrink-0">
              <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center font-display text-white overflow-hidden">
                {activeRoom.other_user?.profile_picture ? <img src={getMediaUrl(activeRoom.other_user.profile_picture)} className="w-full h-full object-cover" /> : activeRoom.other_user?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-white font-medium">{activeRoom.other_user?.first_name ? `${activeRoom.other_user.first_name} ${activeRoom.other_user.last_name}` : activeRoom.other_user?.username}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#ea580c] animate-pulse' : 'bg-red-500'}`}></span>
                  {isConnected ? 'Secure Connection Active' : 'Connecting...'}
                </div>
              </div>
            </div>

            {/* Message History Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_username === currentUser?.username;
                // Add tiny date separator logic if desired, or simple bubbles
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id || idx} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-2xl ${
                      isMe 
                      ? 'bg-gradient-to-br from-[#ea580c] to-red-600 text-white rounded-br-sm shadow-[0_0_15px_rgba(234,88,12,0.2)]' 
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm'
                    }`}>
                      {msg.attachment && (
                        <div className="mb-2">
                           {msg.attachment.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                            <img src={getMediaUrl(msg.attachment)} alt="Attachment" className="max-w-full rounded-xl max-h-60 object-cover border border-white/20" />
                          ) : (
                            <a href={getMediaUrl(msg.attachment)} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-black/20' : 'bg-black/40 hover:bg-black/20'} transition-colors`}>
                              <FileIcon className="w-5 h-5 text-gray-300" />
                              <span className="text-sm underline break-all font-mono">Download File</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {msg.content && <p className="text-sm font-sans whitespace-pre-wrap">{msg.content}</p>}
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-500'} text-right`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-black/20 shrink-0">
              <div className="relative flex items-center gap-3">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  ref={fileInputRef}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isConnected || isUploading}
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Transmit message..." 
                  className="tech-input flex-1 h-12 pr-14"
                  disabled={!isConnected}
                />
                <button 
                  type="submit" 
                  disabled={!inputText.trim() || !isConnected}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea580c] to-red-600 disabled:opacity-50 disabled:grayscale flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4 text-white -mt-0.5 -ml-0.5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-sm">
              <MessageSquare className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-display font-medium text-white mb-2">No Uplink Established</h3>
            <p className="text-gray-500 text-sm max-w-sm">
              Select a peer from your network on the left array, or execute a query to dial a new user.
            </p>
          </div>
        )}
      </GlassCard>

    </motion.div>
  );
}
