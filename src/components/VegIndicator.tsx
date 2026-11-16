import React, { useState } from 'react';
import { Coffee } from 'lucide-react';

export const VegIndicator: React.FC<{ isVeg: boolean; className?: string }> = ({
  isVeg,
  className = '',
}) => {
  if (isVeg) {
    return (
      <span
        role="img"
        aria-label="Vegetarian"
        title="Vegetarian"
        className={`inline-flex items-center justify-center w-4 h-4 rounded-[3px] border-[1.5px] border-[#15803D] bg-white shrink-0 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-[#15803D]" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label="Non-Vegetarian"
      title="Non-Vegetarian"
      className={`inline-flex items-center justify-center w-4 h-4 rounded-[3px] border-[1.5px] border-[#B91C1C] bg-white shrink-0 ${className}`}
    >
      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-[#B91C1C]" aria-hidden="true">
        <polygon points="5,1.5 9,8.5 1,8.5" />
      </svg>
    </span>
  );
};

export const KadakBrandIllustration: React.FC<{ logoUrl?: string; name: string }> = ({
  logoUrl,
  name,
}) => {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
        <img
          src={logoUrl}
          alt={`${name} logo`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-xl"
        />
      </div>
    );
  }

  return (
    <div
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FACC15] text-[#0F172A] flex items-center justify-center shrink-0 shadow-md border-2 border-white/30"
      aria-hidden="true"
    >
      {/* Classic Bombay Cutting Chai Glass & Kettle Emblem */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-9 h-9"
      >
        {/* Steam waves */}
        <path
          d="M19 11C19 9 21 8 21 6"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M25 12C25 10 27 9 27 7"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M31 11C31 9 33 8 33 6"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Fluted Cutting Chai Glass */}
        <path
          d="M15 16H35L32.5 36C32.3 37.7 30.9 39 29.2 39H20.8C19.1 39 17.7 37.7 17.5 36L15 16Z"
          fill="#0F172A"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Chai level inside glass */}
        <path
          d="M16.8 22H33.2L31.6 35.2C31.5 36.2 30.6 37 29.6 37H20.4C19.4 37 18.5 36.2 18.4 35.2L16.8 22Z"
          fill="#FACC15"
        />
        {/* Fluted vertical ridges */}
        <line x1="21.5" y1="24" x2="22" y2="35" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="25" y1="24" x2="25" y2="35" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28.5" y1="24" x2="28" y2="35" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        {/* Brass Saucer Base */}
        <path
          d="M11 40.5H39"
          stroke="#0F172A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const FoodThumbnail: React.FC<{ imageUrl?: string; name: string }> = ({
  imageUrl,
  name,
}) => {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return null;
  }

  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 relative">
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
      {failed && (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
          <Coffee className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};
