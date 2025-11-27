import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', delay = 0 }) => {
  return (
    <div 
      className={`
        backdrop-blur-xl 
        bg-white/60
        border 
        border-white/80 
        shadow-[0_8px_32px_rgba(0,0,0,0.05)]
        rounded-3xl 
        p-6 
        animate-slide-up
        ${className}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};