import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none bg-[#ffffff]">
      {/* Light, vibrant gradient blobs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-200/60 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
      <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/60 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-pink-200/60 rounded-full mix-blend-multiply filter blur-[90px] animate-blob animation-delay-4000"></div>
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] bg-cyan-100/60 rounded-full mix-blend-multiply filter blur-[70px] animate-blob animation-delay-6000"></div>
      
      {/* Subtle Noise Texture for "frosted" feel */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}></div>
      
      {/* Glass sheen overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
    </div>
  );
};