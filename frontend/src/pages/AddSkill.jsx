import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Layers, ArrowRight } from 'lucide-react';
import api from '../api';

export function AddSkill() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    can_teach: false,
    want_to_learn: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('users/skills/', form);
      navigate('/dashboard');
    } catch (err) {
      const errors = Object.values(err.response?.data || {}).flat();
      setError(errors.join(' ') || 'Failed to add skill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[600px] mx-auto p-6">
      <GlassCard className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">ADD NEW SKILL</h1>
            <p className="text-gray-400 text-sm">Register a new module to your profile</p>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-900/20 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-6">
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skill Name</label>
            <input name="name" type="text" className="tech-input w-full h-10" placeholder="e.g. React, Python, UI/UX..." value={form.name} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
            <textarea name="description" className="tech-input w-full h-24 resize-none" placeholder="Describe your skill, experience level..." value={form.description} onChange={handleChange} required />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Mode</label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:border-white/15 transition-colors">
              <input type="checkbox" name="can_teach" checked={form.can_teach} onChange={handleChange} className="w-5 h-5 accent-[#ea580c]" />
              <div>
                <div className="text-white font-medium text-sm">I can teach this skill</div>
                <div className="text-gray-400 text-xs">You will appear in Browse for learners</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:border-white/15 transition-colors">
              <input type="checkbox" name="want_to_learn" checked={form.want_to_learn} onChange={handleChange} className="w-5 h-5 accent-[#ea580c]" />
              <div>
                <div className="text-white font-medium text-sm">I want to learn this skill</div>
                <div className="text-gray-400 text-xs">You will be matched with teachers</div>
              </div>
            </label>
          </div>

          <Button type="submit" variant="primary" fullWidth className="h-12 mt-4" disabled={loading}>
            {loading ? 'Saving...' : 'Add Skill'} <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </GlassCard>
    </motion.div>
  );
}
