import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export function Select({ value, onChange, options, name, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className={`relative min-w-[160px] ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/40 font-tech uppercase text-xs tracking-wider border transition-all flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer outline-none ${
          isOpen ? 'border-[#ea580c] shadow-[0_0_15px_rgba(234,88,12,0.2)]' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <span className={isOpen ? 'text-[#ea580c]' : 'text-gray-300'}>{selectedOption?.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-[#ea580c]' : 'text-gray-500'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute z-50 w-full mt-1.5 bg-[#0d0d0d] border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1 backdrop-blur-xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange({ target: { name, value: option.value } });
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-tech uppercase tracking-wider transition-colors flex items-center justify-between group ${
                  value === option.value
                    ? 'bg-[#ea580c]/10 text-[#ea580c]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {value === option.value && <Check className="w-3 h-3 ml-2 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
