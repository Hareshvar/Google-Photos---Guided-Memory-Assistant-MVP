import React from 'react';

export type NavTab = 'photos' | 'lifestages' | 'chat';

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="sticky bottom-0 w-full z-40 bg-[#faf9fd] pb-safe shrink-0">
      <div className="h-16 pt-1 w-full flex items-center justify-around px-2">
        {/* Photos Tab */}
        <button
          onClick={() => setActiveTab('photos')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs transition-colors ${
            activeTab === 'photos' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className={`px-4 py-1 rounded-full transition-all ${activeTab === 'photos' ? 'bg-blue-tint text-primary' : ''}`}>
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'photos' ? "'FILL' 1" : "'FILL' 0" }}
            >
              photo_library
            </span>
          </div>
          <span>Photos</span>
        </button>

        {/* Life Stages Tab */}
        <button
          id="tour-step-5"
          onClick={() => setActiveTab('lifestages')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs transition-colors ${
            activeTab === 'lifestages' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className={`px-4 py-1 rounded-full transition-all relative ${activeTab === 'lifestages' ? 'bg-blue-tint text-primary' : ''}`}>
            {/* "NEW" Highlight Badge matching Stitch UI inside ribbon */}
            <span className="absolute top-[6px] left-1/2 -translate-x-1/2 bg-[#FBBC04] text-[#202124] text-[8px] font-extrabold px-1.5 py-[0.5px] rounded-full shadow-2xs leading-none uppercase tracking-wider select-none z-10 border border-[#e3a600]/30">
              NEW
            </span>
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'lifestages' ? "'FILL' 1" : "'FILL' 0" }}
            >
              collections_bookmark
            </span>
          </div>
          <span>Life Stages</span>
        </button>

        {/* Guided Search / Chat Tab */}
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs transition-colors ${
            activeTab === 'chat' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className={`px-4 py-1 rounded-full transition-all ${activeTab === 'chat' ? 'bg-blue-tint text-primary' : ''}`}>
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'chat' ? "'FILL' 1" : "'FILL' 0" }}
            >
              auto_awesome
            </span>
          </div>
          <span>Guided Search</span>
        </button>
      </div>
    </nav>
  );
};
