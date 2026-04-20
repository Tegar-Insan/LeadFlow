// src/components/common/TikTokLoginButton.jsx
// Compact TikTok connect/connected badge for CalendarPage header

import React from 'react';

// Glyph extracted pixel-perfect from Button_Black.svg (viewBox 0 0 315 44)
// Cropped to the logo mark region (~x:14-33, y:10-31)
const TikTokGlyph = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    className={className}
    viewBox="14 10 20 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M25.5172 25.0575C25.4647 26.4295 24.3093 27.5306 22.8929 27.5306C22.5691 27.5306 22.2591 27.4729 21.9727 27.3675C22.2591 27.4729 22.5692 27.5306 22.893 27.5306C24.3094 27.5306 25.4648 26.4295 25.5174 25.0576L25.5224 12.8063H27.8124C28.0331 13.971 28.7405 14.9704 29.7205 15.5948C29.7208 15.5952 29.7212 15.5956 29.7215 15.596C30.4037 16.0305 31.2171 16.284 32.0903 16.284V19.3405C30.4684 19.3405 28.9654 18.8334 27.7386 17.9728V24.1852C27.7386 27.2878 25.1559 29.8119 21.9812 29.8119C20.7545 29.8119 19.6169 29.4338 18.6818 28.7921C17.1964 27.7717 16.224 26.0876 16.224 24.1846C16.224 21.0821 18.8067 18.5579 21.9814 18.5579C22.2448 18.5579 22.503 18.5791 22.7572 18.6128V21.7342C22.5115 21.6591 22.2519 21.6154 21.9812 21.6154C20.5314 21.6154 19.3519 22.7683 19.3519 24.1852C19.3519 25.1719 19.9247 26.0292 20.7616 26.4596C21.1265 26.6474 21.541 26.7549 21.9811 26.7549C23.3975 26.7549 24.5529 25.6538 24.6055 24.2819L24.6105 12.0305H27.7385C27.7385 12.2955 27.7646 12.5545 27.8123 12.8063H25.5223L25.5172 25.0575Z"
      fill="white"
    />
  </svg>
);

export default function TikTokLoginButton({ connected, accountName, onConnect, onDisconnect, loading }) {
  if (connected) {
    return (
      <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-black border border-white/10 text-white text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" aria-hidden />
        <TikTokGlyph />
        <span className="truncate max-w-[120px]" title={accountName}>
          {accountName || 'Connected'}
        </span>
        <button
          type="button"
          onClick={onDisconnect}
          title="Disconnect TikTok"
          className="ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={loading}
      className="flex items-center gap-2 px-3 h-8 rounded-lg bg-black hover:bg-zinc-900 border border-white/10 text-white text-xs font-semibold transition-colors disabled:opacity-60"
    >
      <TikTokGlyph />
      {loading ? 'Connecting…' : 'Connect TikTok'}
    </button>
  );
}
