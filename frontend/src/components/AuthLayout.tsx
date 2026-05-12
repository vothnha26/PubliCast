import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden p-4">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Card Glow Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-cyan-500/20 rounded-full blur-3xl opacity-0 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <div className="w-full max-w-lg backdrop-blur-xl bg-slate-900/40 border border-purple-500/30 rounded-xl p-8 relative z-10 shadow-[0_0_60px_rgba(168,85,247,0.15)] hover:shadow-[0_0_80px_rgba(168,85,247,0.2)] transition-shadow duration-300">
        {/* Animated corner accents */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-purple-500/30 rounded-tl-xl opacity-0 hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cyan-500/30 rounded-br-xl opacity-0 hover:opacity-100 transition-opacity" />
        
        {children}
      </div>
    </div>
  );
}
