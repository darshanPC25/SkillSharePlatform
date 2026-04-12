import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ChevronDown, User, Settings, Plus, LogOut, Bell, Trophy } from 'lucide-react';
import api from '../../api';
import { useNotificationContext } from '../../context/NotificationContext';

export function Navbar() {
  const [learningOpen, setLearningOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('access_token');
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationContext();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.get('users/me/').then(res => {
        setUsername(res.data.username);
        const picUrl = res.data.profile?.profile_picture;
        if (picUrl && !picUrl.includes('default.jpg')) {
          setProfilePic(picUrl);
        } else {
          setProfilePic(null);
        }
      }).catch(() => setUsername(''));
    } else {
      setUsername('');
      setProfilePic(null);
    }
  }, [location.pathname]);


  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  const NavLink = ({ to, children }) => {
    const isActive = location.pathname.startsWith(to) && to !== '/' || location.pathname === to;
    return (
      <Link to={to} className={`font-sans text-sm font-medium transition-colors relative group py-2 ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
        {children}
        {isActive && (
          <motion.div
            layoutId="navbar-indicator"
            className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ea580c] to-transparent"
            initial={false}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        {!isActive && (
          <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-300 group-hover:w-full"></span>
        )}
      </Link>
    );
  };

  return (
    <nav className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Branding */}
        <Link to="/" className="flex items-center space-x-3 group text-white">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(234,88,12,0.25)] group-hover:scale-105 transition-transform duration-300">
            <Layers className="text-white w-5 h-5" />
          </div>
          <span className="font-display font-bold tracking-widest text-lg" style={{ letterSpacing: '0.1em' }}>
            Skill<span className="text-[#ea580c] font-light">Swap</span>
          </span>
        </Link>

        {isAuthenticated ? (
          <>
            {/* Middle Nav */}
            <div className="hidden lg:flex items-center space-x-8">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/browse">Browse Skills</NavLink>
              <NavLink to="/matches">My Matches</NavLink>
              
              <div 
                className="relative py-4"
                onMouseEnter={() => setLearningOpen(true)}
                onMouseLeave={() => setLearningOpen(false)}
              >
                <span className="font-sans text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center group">
                  Learning <ChevronDown className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" />
                </span>
                <AnimatePresence>
                  {learningOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full mt-0 p-2 rounded-xl border border-white/10 bg-[#141414]/95 backdrop-blur-xl shadow-2xl min-w-[200px]"
                    >
                      <Link to="/assignments" className="block px-4 py-2.5 font-sans font-medium text-sm text-gray-300 rounded-lg hover:text-white hover:bg-neural-glow/20 transition-colors">Assignments</Link>
                      <Link to="/exams" className="block px-4 py-2.5 font-sans font-medium text-sm text-gray-300 rounded-lg hover:text-white hover:bg-neural-glow/20 transition-colors">Exams</Link>
                      <Link to="/leaderboard" className="block px-4 py-2.5 font-sans font-medium text-sm text-gray-300 rounded-lg hover:text-white hover:bg-neural-glow/20 transition-colors flex items-center">
                        <Trophy className="w-4 h-4 mr-2" /> Leaderboard
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavLink to="/chat">Chat</NavLink>
            </div>

            {/* Notification Bell */}
            {isAuthenticated && (
              <div className="relative" onMouseEnter={() => setNotifOpen(true)} onMouseLeave={() => setNotifOpen(false)}>
                <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                  <Bell className="w-4 h-4 text-gray-300" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ea580c] rounded-full animate-ping opacity-75"></span>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ea580c] rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-[0_0_8px_rgba(234,88,12,0.6)] z-10">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#141414]/98 backdrop-blur-xl shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-[#ea580c] hover:text-orange-400 transition-colors">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-gray-500 text-sm italic">No new notifications</div>
                        ) : (
                          notifications.slice(0, 15).map(n => {
                            const isMeetRequest = n.link?.startsWith('__meet_request__:');
                            const matchId = isMeetRequest ? n.link.split(':')[1] : null;
                            const isJoinReady = !isMeetRequest && n.type === 'video' && n.link?.startsWith('/class/');

                            return (
                              <div key={n.id}
                                className={`flex flex-col gap-2 px-4 py-3 border-b border-white/5 transition-colors ${!n.is_read ? 'bg-[#ea580c]/5' : ''}`}>
                                <div className="flex items-start gap-3">
                                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${ {match:'bg-blue-500', assignment:'bg-yellow-500', chat:'bg-green-500', video:'bg-purple-500', system:'bg-gray-500'}[n.type] || 'bg-gray-500' }`}/>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-200 leading-snug">{n.message}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                                  </div>
                                </div>

                                {/* Action buttons */}
                                {isMeetRequest && (
                                  <button
                                    onClick={async () => {
                                      markRead(n.id);
                                      try {
                                        const res = await api.post(`dashboard/matches/${matchId}/accept_meet/`);
                                        setNotifOpen(false);
                                        navigate(res.data.room_path);
                                      } catch(e) { console.error('accept_meet error:', e); }
                                    }}
                                    className="w-full py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#ea580c] to-red-600 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.969A1 1 0 0121 8v8a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                                    Accept & Create Room
                                  </button>
                                )}


                                {isJoinReady && (
                                  <button
                                    onClick={() => { markRead(n.id); setNotifOpen(false); navigate(n.link); }}
                                    className="w-full py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                    Join Room →
                                  </button>
                                )}

                                {/* Regular clickable notifications (no special action) */}
                                {!isMeetRequest && !isJoinReady && (
                                  <button onClick={() => { markRead(n.id); if (n.link && !n.link.startsWith('__')) navigate(n.link); setNotifOpen(false); }}
                                    className="text-[10px] text-gray-500 hover:text-gray-300 text-left transition-colors">
                                    {n.link && !n.link.startsWith('__') ? '→ Go to page' : 'Dismiss'}
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}


            {/* Profile Dropdown */}
            <div 
              className="relative py-2 flex items-center"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{username || '...'}</div>
                  <div className="text-xs text-[#ea580c] font-medium flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse"></span> Online
                  </div>
                </div>
                <div className="relative w-10 h-10 rounded-full border-2 border-white/10 flex-shrink-0 overflow-hidden bg-black/50 flex items-center justify-center font-display text-lg font-bold text-[#ea580c]">
                  {profilePic ? (
                    <img src={profilePic.startsWith('http') ? profilePic : `${api.defaults.baseURL.replace('/api/', '')}${profilePic}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (username || '?').charAt(0).toUpperCase()
                  )}
                </div>
              </button>
              
              <AnimatePresence>
                {profileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-0 p-2 rounded-xl border border-white/10 bg-[#141414]/95 backdrop-blur-xl shadow-2xl min-w-[200px]"
                  >
                    <Link to="/profile" className="flex items-center px-4 py-2.5 font-sans text-sm text-gray-300 rounded-lg hover:text-white hover:bg-[#ea580c]/20 transition-colors">
                      <User className="w-4 h-4 mr-2 text-[#ea580c]" /> My Profile
                    </Link>
                    <Link to="/settings" className="flex items-center px-4 py-2.5 font-sans text-sm text-gray-300 rounded-lg hover:text-white hover:bg-[#ea580c]/20 transition-colors">
                      <Settings className="w-4 h-4 mr-2 text-[#ea580c]" /> Settings
                    </Link>
                    <Link to="/add-skill" className="flex items-center px-4 py-2.5 font-sans text-sm text-gray-300 rounded-lg hover:text-white hover:bg-[#ea580c]/20 transition-colors">
                      <Plus className="w-4 h-4 mr-2 text-[#ea580c]" /> Add Skill
                    </Link>
                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                    <button onClick={handleLogout} className="w-full flex items-center px-4 py-2.5 font-sans text-sm text-red-400 rounded-lg hover:text-red-300 hover:bg-red-900/20 transition-colors">
                      <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-6">
            <Link to="/login" className="font-sans font-medium text-sm text-gray-300 hover:text-white transition-colors">Log In</Link>
            <Link to="/register" className="px-5 py-2 font-sans font-medium text-sm rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 text-white hover:border-white/20 transition-all">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
