import React from 'react';

interface QalamIconProps {
  className?: string;
  size?: number;
}

/**
 * Qalam Note Signature Icon
 * Features a calligraphic pen nib (Qalam) representing fluid writing in any script (LTR & RTL)
 */
export const QalamIcon: React.FC<QalamIconProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="qalamGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="qalamNib" x1="16" y1="8" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="qalamGold" x1="20" y1="20" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Rounded squircle backdrop */}
      <rect width="48" height="48" rx="12" fill="url(#qalamGrad)" />

      {/* Subtle notebook page edge line */}
      <path
        d="M10 11C10 9.89543 10.8954 9 12 9H14V39H12C10.8954 39 10 38.1046 10 37V11Z"
        fill="#ffffff"
        fillOpacity="0.2"
      />

      {/* Calligraphic Pen Nib (Qalam) */}
      <g transform="translate(2, 0)">
        {/* Main Nib Body */}
        <path
          d="M23 9C23 9 17 19 16 26C15.3 30.9 17 34 23 39C29 34 30.7 30.9 30 26C29 19 23 9 23 9Z"
          fill="url(#qalamNib)"
          filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.25))"
        />

        {/* Nib Collar / Gold Band */}
        <path
          d="M17.5 28C18.8 28.5 20.8 29 23 29C25.2 29 27.2 28.5 28.5 28C28.2 30 27 31.8 25 33C24 33.6 23.5 33.8 23 33.8C22.5 33.8 22 33.6 21 33C19 31.8 17.8 30 17.5 28Z"
          fill="url(#qalamGold)"
        />

        {/* Breather hole */}
        <circle cx="23" cy="22" r="1.75" fill="#1e3a8a" />

        {/* Ink slit leading from tip to breather hole */}
        <line
          x1="23"
          y1="9.5"
          x2="23"
          y2="20.25"
          stroke="#1e3a8a"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
