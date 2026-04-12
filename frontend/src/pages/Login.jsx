import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Network, ArrowRight, Lock, Mail } from 'lucide-react';
import api from '../api';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('token/', { username, password });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      api.defaults.headers['Authorization'] = "Bearer " + response.data.access;
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid system credentials. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <GlassCard className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ea580c] to-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(234,88,12,0.3)]">
              <Network className="text-white w-7 h-7" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold font-display text-white text-center mb-2 tracking-wide">
            ESTABLISH CONNECTION
          </h2>
          <p className="text-gray-400 text-center text-sm mb-8">
            Authenticate to sync with the SkillSwap neural mesh.
          </p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-red-900/20 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-6 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Identifier (Username)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  className="tech-input w-full pl-10" 
                  placeholder="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Secure Key (Password)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="password" 
                  className="tech-input w-full pl-10" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth className="mt-8 h-12" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Connect'} <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New to SkillSwap? <Link to="/register" className="text-[#ea580c] hover:text-[#c2410c] font-medium transition-colors">Register here</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
