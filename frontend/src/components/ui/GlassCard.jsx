import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function GlassCard({ children, className = '', hover = false, index = 0, delay = 0, ...props }) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const hoverProps = hover ? {
    whileHover: { y: -4, scale: 1.01 },
  } : {};

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay + (index * 0.05), ease: [0.25, 1, 0.5, 1] }}
      className={`tech-card relative group ${className}`}
      {...hoverProps}
      {...props}
    >
      {/* Background radial gradient following mouse */}
      <div 
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
        style={{
          background: isHovering ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(234, 88, 12, 0.08), transparent 40%)` : 'none'
        }}
      />
      
      {/* Soft internal border glow */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-[15px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
        style={{
          background: isHovering ? `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(234, 88, 12, 0.25), transparent 40%)` : 'none',
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px"
        }}
      />

      <div className="relative z-10 w-full h-full text-left">
        {children}
      </div>
    </motion.div>
  );
}
