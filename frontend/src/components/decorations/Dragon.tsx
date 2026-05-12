import React from 'react';

export default function Dragon() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      className="animate-bounce"
      style={{ animationDelay: '-0.5s' }}
    >
      <defs>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .dragon { animation: float 3s ease-in-out infinite; }
          .glow { filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.8)); }
        `}</style>
        <linearGradient id="dragonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#2d3748', stopOpacity: 0.9 }} />
          <stop offset="100%" style={{ stopColor: '#000000', stopOpacity: 0.9 }} />
        </linearGradient>
      </defs>

      {/* Glow effect */}
      <circle cx="100" cy="100" r="110" fill="url(#dragonGrad)" opacity="0.1" />

      <g className="dragon">
        {/* Body */}
        <ellipse cx="100" cy="100" rx="45" ry="55" fill="url(#dragonGrad)" />

        {/* Head */}
        <circle cx="100" cy="45" r="28" fill="url(#dragonGrad)" className="glow" />

        {/* Horn Left */}
        <path
          d="M 85 20 Q 70 5 65 -10"
          stroke="#4b5563"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Horn Right */}
        <path
          d="M 115 20 Q 130 5 135 -10"
          stroke="#4b5563"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes */}
        <circle cx="92" cy="40" r="3" fill="#fbbf24" />
        <circle cx="108" cy="40" r="3" fill="#fbbf24" />

        {/* Mouth */}
        <path
          d="M 95 50 Q 100 55 105 50"
          stroke="#fbbf24"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Left Claw */}
        <g>
          <ellipse cx="75" cy="130" rx="12" ry="18" fill="url(#dragonGrad)" />
          <path d="M 70 145 L 65 160" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <path d="M 75 148 L 75 165" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <path d="M 80 145 L 85 160" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Right Claw */}
        <g>
          <ellipse cx="125" cy="130" rx="12" ry="18" fill="url(#dragonGrad)" />
          <path d="M 120 145 L 115 160" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <path d="M 125 148 L 125 165" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <path d="M 130 145 L 135 160" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Tail - flowing */}
        <path
          d="M 100 155 Q 110 175 105 195 Q 100 210 110 220"
          stroke="url(#dragonGrad)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Spikes on back */}
        <path d="M 90 65 L 85 50" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        <path d="M 100 60 L 100 42" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        <path d="M 110 65 L 115 50" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        <path d="M 95 95 L 90 85" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M 105 95 L 110 85" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

        {/* Energy aura */}
        <circle cx="100" cy="100" r="75" fill="none" stroke="#4b5563" strokeWidth="1" opacity="0.3" />
        <circle cx="100" cy="100" r="85" fill="none" stroke="#4b5563" strokeWidth="0.5" opacity="0.2" />
      </g>
    </svg>
  );
}
