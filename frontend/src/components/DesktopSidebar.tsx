import React from 'react';
export type DeviceMode = 'auto' | 'mobile' | 'desktop';
export type NavTab = 'photos' | 'lifestages' | 'chat';

interface DesktopSidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenTagEditor: (action: string) => void;
  deviceMode: DeviceMode;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTagEditor,
  deviceMode,
}) => {
  const showSidebar = deviceMode === 'desktop' || (deviceMode === 'auto');
  const visibilityClass = deviceMode === 'mobile' ? 'hidden' : deviceMode === 'desktop' ? 'flex' : 'hidden md:flex';

  return (
    <aside className={`${visibilityClass} fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest border-r border-surface-container-high z-30 flex-col justify-between py-4 px-3 overflow-y-auto select-none`}>

      <div className="flex flex-col gap-1">
        <nav className="flex flex-col gap-1">
          {/* Photos Tab */}
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full font-medium text-sm transition-all text-left ${
              activeTab === 'photos'
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'photos' ? "'FILL' 1" : "'FILL' 0" }}
            >
              photo_library
            </span>
            <span>Photos</span>
          </button>

          {/* Guided Search / Chat Tab */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full font-medium text-sm transition-all text-left ${
              activeTab === 'chat'
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'chat' ? "'FILL' 1" : "'FILL' 0" }}
            >
              auto_awesome
            </span>
            <span>Guided Search</span>
          </button>

          {/* Life Stages Tab */}
          <button
            onClick={() => setActiveTab('lifestages')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-full font-medium text-sm transition-all text-left ${
              activeTab === 'lifestages'
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: activeTab === 'lifestages' ? "'FILL' 1" : "'FILL' 0" }}
              >
                collections_bookmark
              </span>
              <span>Life Stages</span>
            </div>
            <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              NEW
            </span>
          </button>

          {/* Bulk Tag Action */}
          <button
            onClick={() => onOpenTagEditor('bulk')}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full font-medium text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all text-left"
          >
            <span className="material-symbols-outlined text-[22px]">date_range</span>
            <span>Bulk Tag Timeline</span>
          </button>
        </nav>

        <div className="h-px bg-surface-container-high my-3 mx-2" />

        {/* Library Section */}
        <div className="px-4 py-1 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          Library
        </div>
        <nav className="flex flex-col gap-1">
          <button className="flex items-center gap-3 px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition-all text-left">
            <span className="material-symbols-outlined text-[20px]">star_outline</span>
            <span>Favorites</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition-all text-left">
            <span className="material-symbols-outlined text-[20px]">photo_album</span>
            <span>Albums</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition-all text-left">
            <span className="material-symbols-outlined text-[20px]">archive</span>
            <span>Archive</span>
          </button>
        </nav>
      </div>

      {/* Storage Indicator Widget */}
      <div className="px-4 pt-3 border-t border-surface-container-high">
        <div className="flex items-center gap-2 text-on-surface-variant mb-1.5">
          <span className="material-symbols-outlined text-[18px]">cloud</span>
          <span className="text-xs font-medium">Storage</span>
        </div>
        <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-1">
          <div className="bg-primary h-full rounded-full" style={{ width: '45%' }} />
        </div>
        <p className="text-[11px] text-outline">6.8 GB of 15 GB used</p>
      </div>
    </aside>
  );
};
