import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Star, Target, Crown } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
import { GlassCard } from '../components/ui/GlassCard';

export function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('dashboard/leaderboard/')
      .then(res => setLeaders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRankBadge = (rating) => {
    if (rating >= 2200) return { name: 'Grandmaster', color: 'from-purple-500 to-indigo-600', icon: Crown, border: 'border-purple-500/50' };
    if (rating >= 1900) return { name: 'Platinum', color: 'from-teal-400 to-emerald-500', icon: Target, border: 'border-teal-400/50' };
    if (rating >= 1600) return { name: 'Gold', color: 'from-yellow-400 to-amber-600', icon: Trophy, border: 'border-yellow-500/50' };
    if (rating >= 1400) return { name: 'Silver', color: 'from-gray-300 to-gray-500', icon: Medal, border: 'border-gray-400/50' };
    return { name: 'Bronze', color: 'from-orange-700 to-yellow-900', icon: Star, border: 'border-orange-800/50' };
  };

  if (loading) return <div className="text-center py-20 text-[#ea580c] animate-pulse">Scanning Global Arrays...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" /> GLOBAL LEADERBOARD
          </h1>
          <p className="text-gray-400 text-sm mt-1">Top 100 highest rated participants.</p>
        </div>
      </div>

      <div className="space-y-4">
        {leaders.map((user) => {
          const badge = getRankBadge(user.rating);
          const BadgeIcon = badge.icon;
          
          return (
            <GlassCard key={user.username} className={`p-4 flex items-center justify-between border ${badge.border} transition-transform hover:scale-[1.01]`}>
              <div className="flex items-center gap-6">
                <div className="text-2xl font-bold text-white/50 w-8 text-center font-mono">#{user.rank}</div>
                <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-black/40">
                  {user.profile_picture ? (
                    <img src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_BASE_URL.replace('/api/', '')}${user.profile_picture}`} className="w-full h-full object-cover" alt={user.username} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{user.username.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div>
                  <Link to={`/u/${user.username}`} target="_blank" className="text-lg font-bold text-white hover:text-[#ea580c] transition-colors flex items-center gap-2">
                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </Link>
                  <p className="text-gray-400 text-xs font-mono">@{user.username}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="text-3xl font-display font-bold text-white flex items-center gap-2">
                  <BadgeIcon className={`w-5 h-5 text-gray-400 opacity-80`} />
                  {user.rating.toFixed(1)}
                </div>
                <div className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-gradient-to-r ${badge.color} text-white shadow-lg`}>
                  {badge.name}
                </div>
              </div>
            </GlassCard>
          );
        })}
        {leaders.length === 0 && (
           <div className="text-center py-10 text-gray-500 font-tech">NO ELITE USERS DETECTED IN GRID.</div>
        )}
      </div>
    </motion.div>
  );
}
