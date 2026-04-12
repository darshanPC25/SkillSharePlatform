import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Server } from 'lucide-react';

export function Placeholder({ title }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto p-6 mt-16"
    >
      <GlassCard className="p-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-[#ea580c]/10 border border-[#ea580c]/20 flex items-center justify-center mb-6">
          <Server className="w-8 h-8 text-[#ea580c] animate-pulse" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-4 uppercase tracking-wider">{title}</h1>
        <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
          The <span className="text-[#ea580c] font-mono mx-1">{title}</span> subsystem has not yet been mounted to the React framework.
          Please route your requests to the Dashboard or Home interface until this module is ported.
        </p>
      </GlassCard>
    </motion.div>
  );
}
