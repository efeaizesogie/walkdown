import React from 'react';

// The Walkdown mark: a trace rail with two passed stations, the broken link (red) and one not yet reached.
export function LogoMark({ size = 40, title = 'Walkdown' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 144 144" role="img" aria-label={title} className="logo-mark">
      <rect x="4" y="4" width="136" height="136" rx="28" fill="#44546F" />
      <line x1="30" y1="72" x2="114" y2="72" stroke="#B3B9C4" strokeWidth="6" strokeLinecap="round" />
      <line x1="30" y1="72" x2="88" y2="72" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <circle cx="30" cy="72" r="11" fill="#FFFFFF" />
      <circle cx="59" cy="72" r="11" fill="#FFFFFF" />
      <circle cx="88" cy="72" r="13" fill="#C9372C" stroke="#FFFFFF" strokeWidth="5" />
      <path d="M82.5 66.5l11 11M93.5 66.5l-11 11" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="114" cy="72" r="8" fill="none" stroke="#B3B9C4" strokeWidth="4" strokeDasharray="3 3" />
    </svg>
  );
}

export function Lockup() {
  return (
    <div className="lockup">
      <LogoMark size={40} />
      <h1>Walkdown</h1>
    </div>
  );
}
