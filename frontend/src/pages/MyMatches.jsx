import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Users, CheckCircle, XCircle, Clock, Video, MessageSquare } from 'lucide-react';
import api from '../api';

export function MyMatches() {
  const [data, setData] = useState({ sent_matches: [], received_matches: [] });
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState({}); // { [matchId_type]: 'sending' | 'sent' }

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    try {
      const res = await api.get('dashboard/matches/');
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const accept = async (id) => {
    await api.post(`dashboard/matches/accept/${id}/`);
    fetchMatches();
  };

  const reject = async (id) => {
    await api.post(`dashboard/matches/reject/${id}/`);
    fetchMatches();
  };

  const requestContact = async (id, type) => {
    const key = `${id}_${type}`;
    setRequestStatus(prev => ({ ...prev, [key]: 'sending' }));
    try {
      await api.post(`dashboard/matches/${id}/request_contact/`, { type });
      setRequestStatus(prev => ({ ...prev, [key]: 'sent' }));
      setTimeout(() => setRequestStatus(prev => ({ ...prev, [key]: null })), 3000);
    } catch (e) {
      console.error(e);
      setRequestStatus(prev => ({ ...prev, [key]: null }));
    }
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'text-yellow-400 bg-yellow-900/20',
      accepted: 'text-green-400 bg-green-900/20',
      rejected: 'text-red-400 bg-red-900/20',
    };
    return (
      <span className={`text-xs font-mono px-2 py-1 rounded ${colors[status] || ''}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-24 text-[#ea580c]"><Users className="w-8 h-8 animate-pulse" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto p-6">
      <h1 className="text-3xl font-display font-bold text-white tracking-wide mb-2">MY MATCHES</h1>
      <p className="text-gray-400 text-sm mb-8">Manage your skill exchange requests</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Received Requests */}
        <GlassCard className="p-6">
          <h2 className="font-tech text-xs tracking-widest text-[#ea580c] mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4" /> INCOMING REQUESTS
          </h2>
          {data.received_matches.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No incoming requests.</p>
          ) : (
            <div className="space-y-4">
              {data.received_matches.map(match => (
                <div key={match.id} className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-medium"><Link to={`/u/${match.user?.username}`} target="_blank" className="hover:text-[#ea580c] transition-colors">{match.user?.username}</Link></p>
                      <p className="text-gray-400 text-sm">wants to exchange: <span className="text-[#ea580c]">{match.skill?.name}</span></p>
                    </div>
                    <StatusBadge status={match.status} />
                  </div>
                  {match.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => accept(match.id)} className="flex-1 py-1.5 text-xs font-medium text-green-400 border border-green-700/50 rounded-lg hover:bg-green-900/20 transition-colors flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Accept
                      </button>
                      <button onClick={() => reject(match.id)} className="flex-1 py-1.5 text-xs font-medium text-red-400 border border-red-700/50 rounded-lg hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}

                  {/* Contact Action Buttons */}
                  <div className="flex gap-2 mt-3 border-t border-white/5 pt-3">
                    <button 
                      onClick={() => requestContact(match.id, 'chat')}
                      disabled={requestStatus[`${match.id}_chat`] === 'sending' || requestStatus[`${match.id}_chat`] === 'sent'}
                      className="flex-1 py-1.5 text-xs font-medium text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 hover:text-[#ea580c] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <MessageSquare className="w-3 h-3" /> {requestStatus[`${match.id}_chat`] === 'sent' ? 'Sent!' : 'Req Chat'}
                    </button>
                    <button 
                      onClick={() => requestContact(match.id, 'meet')}
                      disabled={requestStatus[`${match.id}_meet`] === 'sending' || requestStatus[`${match.id}_meet`] === 'sent'}
                      className="flex-1 py-1.5 text-xs font-medium text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 hover:text-[#ea580c] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Video className="w-3 h-3" /> {requestStatus[`${match.id}_meet`] === 'sent' ? '✓ Request Sent' : 'Request Meet'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Sent Requests */}
        <GlassCard className="p-6">
          <h2 className="font-tech text-xs tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" /> SENT REQUESTS
          </h2>
          {data.sent_matches.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No sent requests.</p>
          ) : (
            <div className="space-y-4">
              {data.sent_matches.map(match => (
                <div key={match.id} className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium"><Link to={`/u/${match.matched_user?.username}`} target="_blank" className="hover:text-[#ea580c] transition-colors">{match.matched_user?.username}</Link></p>
                      <p className="text-gray-400 text-sm">Skill: <span className="text-[#ea580c]">{match.skill?.name}</span></p>
                    </div>
                    <StatusBadge status={match.status} />
                  </div>
                  
                  {/* Contact Action Buttons */}
                  <div className="flex gap-2 mt-3 border-t border-white/5 pt-3">
                    <button 
                      onClick={() => requestContact(match.id, 'chat')}
                      disabled={requestStatus[`${match.id}_chat`] === 'sending' || requestStatus[`${match.id}_chat`] === 'sent'}
                      className="flex-1 py-1.5 text-xs font-medium text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 hover:text-[#ea580c] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <MessageSquare className="w-3 h-3" /> {requestStatus[`${match.id}_chat`] === 'sent' ? 'Sent!' : 'Req Chat'}
                    </button>
                    <button 
                      onClick={() => requestContact(match.id, 'meet')}
                      disabled={requestStatus[`${match.id}_meet`] === 'sending' || requestStatus[`${match.id}_meet`] === 'sent'}
                      className="flex-1 py-1.5 text-xs font-medium text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 hover:text-[#ea580c] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Video className="w-3 h-3" /> {requestStatus[`${match.id}_meet`] === 'sent' ? '✓ Request Sent' : 'Request Meet'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}
