import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function Button({ 
  children, 
  variant = 'neural', 
  className = '', 
  fullWidth = false,
  ...props 
}) {
  const buttonRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const baseClasses = "relative px-6 py-3 font-sans font-medium text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 overflow-hidden";
  const variantClasses = {
    neural: "bg-[#111] border border-white/10 text-white hover:border-white/20 hover:text-white",
    primary: "bg-[#ea580c] text-white shadow-[0_0_15px_rgba(234,88,12,0.4)] hover:bg-[#c2410c] hover:shadow-[0_0_25px_rgba(234,88,12,0.6)] border border-[#ea580c]/50",
    ghost: "text-gray-300 hover:text-white hover:bg-white/5 border border-transparent",
    danger: "border border-red-900/50 text-red-500 hover:bg-red-900/20"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <motion.button 
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {/* Dynamic hover glow follow */}
      {isHovering && variant !== 'ghost' && (
        <div 
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 mix-blend-screen"
          style={{
            background: `radial-gradient(100px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.15), transparent 100%)`
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
