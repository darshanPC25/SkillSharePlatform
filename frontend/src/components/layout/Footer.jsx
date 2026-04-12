import React, { useState } from 'react';
import { Layers, Globe, MessageCircle, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function Footer() {
  const [showFooter, setShowFooter] = useState(false);

  return (
    <>
      {/* Drop Up Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowFooter(!showFooter)}
        className="fixed bottom-6 right-6 z-50 w-8 h-8 rounded-full bg-[#ea580c] text-white shadow-[0_0_15px_rgba(234,88,12,0.4)] flex items-center justify-center hover:bg-orange-500 transition-colors"
      >
        {showFooter ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </motion.button>

      <AnimatePresence>
        {showFooter && (
          <motion.footer 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl fixed bottom-0 w-full z-40 transition-shadow shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-12"
          >
            <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                
                {/* Logo & Info */}
                <div className="md:col-span-1">
                  <Link to="/" className="flex items-center space-x-3 group text-white mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea580c] to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.25)]">
                      <Layers className="text-white w-4 h-4" />
                    </div>
                    <span className="font-display font-bold tracking-widest" style={{ letterSpacing: '0.1em' }}>
                      Skill<span className="text-[#ea580c] font-light">Swap</span>
                    </span>
                  </Link>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    A decentralized knowledge exchange matrix. Connect with experts globally and upgrade your neural skill tree.
                  </p>
                  <div className="flex items-center space-x-4">
                    <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#ea580c] hover:bg-[#ea580c]/10 transition-colors">
                      <Globe className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#ea580c] hover:bg-[#ea580c]/10 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-[#ea580c] hover:bg-[#ea580c]/10 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Links 1 */}
                <div>
                  <h4 className="font-display font-bold text-white tracking-widest text-sm mb-4">PLATFORM</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><Link to="/browse" className="hover:text-[#ea580c] transition-colors">Browse Matrix</Link></li>
                    <li><Link to="/register" className="hover:text-[#ea580c] transition-colors">Initialize Node</Link></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Top Experts</a></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Global Leaderboard</a></li>
                  </ul>
                </div>

                {/* Links 2 */}
                <div>
                  <h4 className="font-display font-bold text-white tracking-widest text-sm mb-4">RESOURCES</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Documentation</a></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">API Uplink</a></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">System Status</a></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Security Details</a></li>
                  </ul>
                </div>

                {/* Links 3 */}
                <div>
                  <h4 className="font-display font-bold text-white tracking-widest text-sm mb-4">LEGAL</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Privacy Protocol</a></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Terms of Service</a></li>
                    <li><a href="#" className="hover:text-[#ea580c] transition-colors">Cookie Policy</a></li>
                  </ul>
                </div>

              </div>

              <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600">
                <p>© {new Date().getFullYear()} SkillSwap Grid. All nodes reserved.</p>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  System Operational
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </>
  );
}
