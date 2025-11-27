import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden -z-10 bg-[#fdfbf7]">
      {/* 
        NEW STRATEGY:
        1. High Opacity Blobs (0.6 - 0.8) to ensure colors are seen.
        2. Distinct Colors (Violet, Yellow, Rose, Cyan) that don't muddy when mixed.
        3. Massive spread of elements to cover the whole screen.
        4. "Normal" blending for base visibility, with some layering.
      */}

      {/* 1. Top Left - Rich Violet */}
      <div 
        className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-violet-300/70 rounded-full blur-[80px] animate-blob"
      ></div>

      {/* 2. Top Right - Bright Lemon Yellow */}
      <div 
        className="absolute top-[0%] -right-[10%] w-[50vw] h-[50vw] bg-yellow-200/80 rounded-full blur-[80px] animate-blob-reverse animation-delay-2000"
      ></div>

      {/* 3. Bottom Left - Soft Rose Pink */}
      <div 
        className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] bg-rose-300/70 rounded-full blur-[90px] animate-blob animation-delay-4000"
      ></div>

      {/* 4. Bottom Right - Electric Cyan */}
      <div 
        className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] bg-cyan-300/70 rounded-full blur-[80px] animate-blob-reverse animation-delay-6000"
      ></div>

      {/* 5. Center/Floating - Fresh Mint Green */}
      <div 
        className="absolute top-[30%] left-[20%] w-[40vw] h-[40vw] bg-emerald-300/60 rounded-full blur-[70px] animate-blob animation-delay-8000"
      ></div>

      {/* 6. Accent - Deep Lavender (Floating) */}
      <div 
        className="absolute bottom-[30%] right-[30%] w-[35vw] h-[35vw] bg-indigo-300/50 rounded-full blur-[60px] animate-blob-reverse animation-delay-4000"
      ></div>

      {/* Noise Texture Overaly - Crucial for the "Frosted" look */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}></div>
    </div>
  );
};