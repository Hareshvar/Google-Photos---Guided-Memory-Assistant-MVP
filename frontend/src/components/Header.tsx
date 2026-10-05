import React, { useState } from 'react';

interface HeaderProps {
  onOpenChat: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onStartTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenChat,
  searchQuery,
  setSearchQuery,
  onStartTour,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <>
      {/* Main Top Header matching mobile viewport */}
      <header className="sticky top-0 w-full z-40 bg-[#faf9fd] pt-safe shrink-0">
        <div className="h-16 px-4 flex items-center justify-between gap-3 w-full">
          {/* Top-Left Corner: Official Google Photos Logo from LOGO.png/screen.png */}
          <div className="flex items-center shrink-0 cursor-pointer" title="Google Photos">
            <img
              src="/logo.png"
              alt="Google Photos"
              className="w-8 h-8 object-contain shrink-0 select-none drop-shadow-xs"
            />
          </div>

          {/* Search Bar Input Pill matching Google Photos Mobile */}
          <div className="flex-1 flex items-center bg-surface-container-lowest rounded-full h-11 px-3 shadow-[0_2px_6px_rgba(60,64,67,0.08),0_1px_2px_rgba(60,64,67,0.12)] gap-2 border border-border-divider/60 focus-within:ring-2 focus-within:ring-primary/40 transition-all min-w-0">
            <span className="material-symbols-outlined text-primary text-xl shrink-0">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Photos..."
              className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none font-body-md truncate"
            />

            {/* Ask AI / Memory Pill Badge inside Search Bar matching Stitch */}
            <button
              id="tour-step-2"
              onClick={onOpenChat}
              className="flex items-center gap-1.5 shrink-0 bg-[#E8F0FE] text-[#1b66c9] px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-[#d8e8ff] border border-[#c2d9ff] shadow-2xs active:scale-95 transition-all"
              title="Guided Memory Assistant Chat"
            >
              <span className="material-symbols-outlined text-sm text-[#FBBC04]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              <span className="text-[#1b66c9] font-medium text-xs">Memory</span>
            </button>
          </div>

          {/* Top-Right Corner: Tour Help Button & User Profile Photo */}
          <div className="flex items-center justify-center gap-1 shrink-0">
            {onStartTour && (
              <button
                onClick={onStartTour}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F6368] hover:text-[#0058bd] hover:bg-[#efedf1] active:scale-95 transition-all"
                title="Product Tour"
                aria-label="Start Product Tour"
              >
                <span className="material-symbols-outlined text-xl">help_outline</span>
              </button>
            )}

            <button
              aria-label="User Account Profile"
              className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden hover:opacity-90 active:scale-95 transition-all border border-primary/20 shadow-xs"
            >
              {!imgError ? (
                <img
                  src="/profile.png"
                  alt="User Profile"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  DP
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Ask Memories button removed per user request */}
    </>
  );
};
