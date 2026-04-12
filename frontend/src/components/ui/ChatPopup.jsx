import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, MessageSquare, Minimize2, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

/**
 * ChatPopup — A floating mini-messenger popup that appears when a new
 * chat message arrives. Allows inline reply without navigating to /chat.
 *
 * Props (all from useChatPopup / context):
 *   popupRoom     – { id, name, other_user } | null
 *   popupMessages – Message[]
 *   dismissPopup  – () => void
 *   sendPopupMsg  – (text) => void
 *   currentUser   – { username, … } | null
 */
export function ChatPopup({ popupRoom, popupMessages, dismissPopup, sendPopupMsg, currentUser }) {
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll on new messages
  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [popupMessages, minimized]);

  // Focus input when popup opens
  useEffect(() => {
    if (popupRoom && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [popupRoom, minimized]);

  // Reset minimized state when a new room pops up
  useEffect(() => {
    if (popupRoom) setMinimized(false);
  }, [popupRoom?.name]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendPopupMsg(input.trim());
      setInput('');
    }
  };

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `http://127.0.0.1:8000${path.startsWith('/') ? path : '/' + path}`;
  };

  const otherUser = popupRoom?.other_user;
  const displayName = otherUser?.first_name
    ? `${otherUser.first_name} ${otherUser.last_name}`
    : otherUser?.username || '...';
  const avatarLetter = (otherUser?.username || 'U').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {popupRoom && (
        <motion.div
          key={popupRoom.name}
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed bottom-6 right-6 z-[9998] w-[340px] flex flex-col rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-white/10"
          style={{ maxHeight: minimized ? '56px' : '460px' }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-white/8 cursor-pointer select-none shrink-0"
            onClick={() => setMinimized(m => !m)}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {otherUser?.profile_picture
                  ? <img src={getMediaUrl(otherUser.profile_picture)} className="w-full h-full object-cover" alt={displayName} />
                  : avatarLetter
                }
              </div>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-teal-400 border border-[#0f0f0f]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate">{displayName}</p>
              <p className="text-teal-400 text-[10px] font-mono">LIVE UPLINK</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/chat'); dismissPopup(); }}
                title="Open full chat"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                {minimized
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <Minimize2 className="w-3.5 h-3.5" />
                }
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); dismissPopup(); }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/30 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Body (hidden when minimized) ── */}
          {!minimized && (
            <>
              {/* Gradient accent bar */}
              <div className="h-[2px] bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-600 shrink-0" />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-[#0d0d0d]/98 backdrop-blur-xl p-3 space-y-2 no-scrollbar">
                {popupMessages.length === 0 && (
                  <p className="text-center text-gray-600 text-xs py-6">No messages yet. Say hi! 👋</p>
                )}
                {popupMessages.map((msg, idx) => {
                  const isMe = msg.sender_username === currentUser?.username;
                  return (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                        isMe
                          ? 'bg-gradient-to-br from-teal-600 to-cyan-500 text-white rounded-br-sm shadow-[0_0_12px_rgba(20,184,166,0.25)]'
                          : 'bg-white/8 border border-white/10 text-gray-200 rounded-bl-sm'
                      }`}>
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                        {msg.attachment && (
                          <p className="text-[10px] opacity-70 italic mt-0.5">📎 Attachment</p>
                        )}
                        <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/50' : 'text-gray-600'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-3 py-2.5 bg-[#0d0d0d]/98 border-t border-white/8 shrink-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Reply..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/60 focus:bg-white/8 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center disabled:opacity-40 disabled:grayscale shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4 text-white -mt-px -ml-px" />
                </button>
              </form>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
