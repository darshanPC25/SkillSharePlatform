import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Search, Layers, Users, ArrowRight } from 'lucide-react';
import api from '../api';
import { Link } from 'react-router-dom';

export function BrowseSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [requesting, setRequesting] = useState({});
  const [done, setDone] = useState({});

  useEffect(() => {
    fetchSkills();
  }, [search, filter]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filter) params.can_teach = filter;
      const res = await api.get('dashboard/browse/', { params });
      setSkills(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMatchRequest = async (skillId) => {
    setRequesting(r => ({ ...r, [skillId]: true }));
    try {
      await api.post(`dashboard/matches/request/${skillId}/`);
      setDone(d => ({ ...d, [skillId]: true }));
    } catch (e) {
      alert(e.response?.data?.error || 'Request failed.');
    } finally {
      setRequesting(r => ({ ...r, [skillId]: false }));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">BROWSE SKILLS</h1>
          <p className="text-gray-400 text-sm mt-1">Discover expertise on the global mesh network</p>
        </div>
        <Link to="/add-skill">
          <Button variant="primary"><Layers className="w-4 h-4" /> Add My Skill</Button>
        </Link>
      </div>

      {/* Filters */}
      <GlassCard className="p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            className="tech-input w-full pl-10 h-10"
            placeholder="Search skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {[['', 'All'], ['true', 'Teaching'], ['false', 'Learning']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === val ? 'bg-[#ea580c] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Skills Grid */}
      {loading ? (
        <div className="flex justify-center py-24 text-[#ea580c]"><Layers className="w-8 h-8 animate-pulse" /></div>
      ) : skills.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No skills found matching your query.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {skills.map((skill, idx) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassCard hover className="p-6 h-full flex flex-col">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{skill.name}</h3>
                      <span className={`text-xs font-mono px-2 py-1 rounded ${skill.can_teach ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
                        {skill.proficiency}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#ea580c]/10 border border-[#ea580c]/20 flex items-center justify-center text-[#ea580c] text-sm font-bold flex-shrink-0">
                      {skill.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-4 line-clamp-3">{skill.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <span className="text-xs text-gray-500">By <Link to={`/u/${skill.username}`} target="_blank" className="text-gray-300 hover:text-[#ea580c] transition-colors">{skill.username}</Link></span>
                    {done[skill.id] ? (
                      <span className="text-green-400 text-xs font-mono">REQUEST SENT ✓</span>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-xs px-3 py-1 h-auto border border-white/10"
                        onClick={() => sendMatchRequest(skill.id)}
                        disabled={requesting[skill.id]}
                      >
                        {requesting[skill.id] ? '...' : 'Connect'} <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
