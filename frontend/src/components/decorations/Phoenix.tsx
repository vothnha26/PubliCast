import React from 'react';

export default function Phoenix() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      className="animate-bounce"
      style={{ animationDelay: '0s' }}
    >
      <defs>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .phoenix { animation: float 3s ease-in-out infinite; }
          .glow { filter: drop-shadow(0 0 10px rgba(34, 197, 227, 0.6)); }
          .flicker { animation: flicker 0.5s ease-in-out infinite; }
          @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}</style>
        <linearGradient id="phoenixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 0.8 }} />
        </linearGradient>
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#dc2626', stopOpacity: 0.7 }} />
          <stop offset="50%" style={{ stopColor: '#f97316', stopOpacity: 0.7 }} />
          <stop offset="100%" style={{ stopColor: '#fbbf24', stopOpacity: 0.7 }} />
        </linearGradient>
      </defs>

      {/* Glow effect */}
      <circle cx="100" cy="100" r="110" fill="url(#phoenixGrad)" opacity="0.1" />

      <g className="phoenix">
        {/* Body */}
        <ellipse cx="100" cy="110" rx="35" ry="50" fill="url(#phoenixGrad)" />

        {/* Head */}
        <circle cx="100" cy="50" r="25" fill="url(#phoenixGrad)" className="glow" />

        {/* Crest */}
        <g>
          <path
            d="M 90 30 Q 85 10 88 -5"
            stroke="#06b6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className="flicker"
          />
          <path
            d="M 100 25 Q 100 5 105 -8"
            stroke="#06b6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className="flicker"
          />
          <path
            d="M 110 30 Q 115 10 112 -5"
            stroke="#06b6d4"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className="flicker"
          />
        </g>

        {/* Beak */}
        <path
          d="M 110 50 L 135 48 L 110 54 Z"
          fill="#fbbf24"
          stroke="#f97316"
          strokeWidth="1"
        />

        {/* Eyes */}
        <circle cx="95" cy="45" r="3" fill="#fbbf24" />

        {/* Left Wing */}
        <g>
          <ellipse cx="70" cy="100" rx="25" ry="40" fill="url(#phoenixGrad)" opacity="0.9" />
          <path d="M 50 80 L 45 60" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 55 100 L 40 95" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 50 120 L 45 140" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Right Wing */}
        <g>
          <ellipse cx="130" cy="100" rx="25" ry="40" fill="url(#phoenixGrad)" opacity="0.9" />
          <path d="M 150 80 L 155 60" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 145 100 L 160 95" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
          <path d="M 150 120 L 155 140" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Tail Feathers - flowing like fire */}
        <g className="flicker">
          <path
            d="M 90 160 Q 80 180 75 210"
            stroke="url(#fireGrad)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 100 165 Q 100 190 105 225"
            stroke="url(#fireGrad)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 110 160 Q 120 180 125 210"
            stroke="url(#fireGrad)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* Flame aura around body */}
        <g opacity="0.6" className="flicker">
          <circle cx="80" cy="90" r="15" fill="url(#fireGrad)" opacity="0.4" />
          <circle cx="120" cy="90" r="15" fill="url(#fireGrad)" opacity="0.4" />
          <circle cx="100" cy="140" r="20" fill="url(#fireGrad)" opacity="0.3" />
        </g>

        {/* Energy rings */}
        <circle cx="100" cy="100" r="70" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.2" />
      </g>
    </svg>
  );
}
