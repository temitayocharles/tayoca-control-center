import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Tayoca brand mark rendered inline so it inherits the app theme without
 * requiring an external asset request.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 32, className = '', rounded = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Tayoca"
  >
    <defs>
      <linearGradient id="tayocaBase" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#126B5E" />
        <stop offset="1" stopColor="#0C3A34" />
      </linearGradient>
      <linearGradient id="tayocaAccent" x1="20" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E5B572" />
        <stop offset="1" stopColor="#B8772F" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx={rounded ? 16 : 0} fill="url(#tayocaBase)" />
    <path d="M18 22h28" stroke="#F5EFE4" strokeWidth="5" strokeLinecap="round" />
    <path d="M32 22v26" stroke="#F5EFE4" strokeWidth="5" strokeLinecap="round" />
    <path d="M32 33l10 9" stroke="url(#tayocaAccent)" strokeWidth="5" strokeLinecap="round" />
  </svg>
);
