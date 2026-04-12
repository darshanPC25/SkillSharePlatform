import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, MessageSquare, Video, Award, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
  chat:       { icon: MessageSquare, color: 'from-teal-500 to-cyan-400',     dot: 'bg-teal-400' },
  video:      { icon: Video,         color: 'from-purple-600 to-violet-500', dot: 'bg-purple-400' },
  match:      { icon: Bell,          color: 'from-blue-600 to-cyan-500',      dot: 'bg-blue-400'  },
  assignment: { icon: Award,         color: 'from-yellow-500 to-amber-400',  dot: 'bg-yellow-400' },
  system:     { icon: Bell,          color: 'from-gray-600 to-gray-500',      dot: 'bg-gray-400'  },
};

function AvatarBadge({ cfg, toast }) {
  if (toast.type === 'chat' && toast._senderName) {
    return (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg text-white font-bold text-sm">
        {toast._senderName.charAt(0).toUpperCase()}
      </div>
    );
  }
  const Icon = cfg.icon;
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shrink-0 shadow-lg`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
  );
}


function Toast({ toast, onDismiss }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.system;
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  const isMeetRequest = toast.link?.startsWith('__meet_request__:');

  const handleClick = () => {
    onDismiss(toast.id);
    if (!isMeetRequest && toast.link && !toast.link.startsWith('__')) {
      navigate(toast.link);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.88, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="relative w-[340px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
      onClick={handleClick}
    >
      {/* Gradient top-bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${cfg.color}`} />

      {/* Glass body */}
      <div className="bg-[#141414]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-start gap-3">
        {/* Icon / Avatar badge */}
        <AvatarBadge cfg={cfg} toast={toast} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-snug line-clamp-2">{toast.message}</p>
          {!isMeetRequest && toast.link && !toast.link.startsWith('__') && (
            <p className="text-[11px] text-gray-400 mt-1">Tap to open →</p>
          )}
          {isMeetRequest && (
            <p className="text-[11px] text-purple-300 mt-1">Open notifications to accept ↗</p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r ${cfg.color} opacity-60`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  );
}

export function NotificationToastContainer({ toasts, dismissToast, offsetBottom = 24 }) {
  return (
    <motion.div
      className="fixed right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      animate={{ bottom: offsetBottom }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

