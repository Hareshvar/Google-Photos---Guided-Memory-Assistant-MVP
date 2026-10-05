import React from 'react';
import { Photo } from '../lib/types';
import { getPhotoImageUrl } from '../lib/api';

interface LibraryViewProps {
  photos: Photo[];
  selectedPhotoIds: string[];
  setSelectedPhotoIds: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenTagEditor: (action?: string) => void;
  onConfirmSelectedSuggestions: () => void;
  onOpenPhotoViewer: (photoIndex: number, customPhotos?: Photo[]) => void;
  onSimulatedUpload?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  photos,
  selectedPhotoIds,
  setSelectedPhotoIds,
  onOpenTagEditor,
  onConfirmSelectedSuggestions,
  onOpenPhotoViewer,
  onSimulatedUpload,
}) => {
  const [activeMenuMonth, setActiveMenuMonth] = React.useState<string | null>(null);

  const toggleSelectPhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const clearSelection = () => {
    setSelectedPhotoIds([]);
  };

  const isSelectionActive = selectedPhotoIds.length > 0;

  // Helper function to format timestamp (YYYY-MM-DD) safely without timezone offset issues
  const formatMonthYear = (timestamp: string): string => {
    const parts = timestamp.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
    return timestamp;
  };

  const formatShortMonthYear = (timestamp: string): string => {
    const parts = timestamp.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
    return timestamp;
  };

  // Sort photos in reverse chronological order (newest timestamp first)
  const sortedPhotos = [...photos].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Group photos by timeline month/year (maintaining reverse chronological order)
  const groupedPhotos: { [key: string]: Photo[] } = {};
  sortedPhotos.forEach((photo) => {
    const groupKey = formatMonthYear(photo.timestamp);
    if (!groupedPhotos[groupKey]) {
      groupedPhotos[groupKey] = [];
    }
    groupedPhotos[groupKey].push(photo);
  });

  // Dynamically extract ONLY CONFIRMED memory tag groups for "Recent memories" story cards
  const confirmedMemoryMap: { [label: string]: { photos: Photo[]; latestTimestamp: string } } = {};
  photos.forEach((photo) => {
    photo.tags.forEach((tag) => {
      if (tag.status === 'confirmed') {
        if (!confirmedMemoryMap[tag.label]) {
          confirmedMemoryMap[tag.label] = { photos: [], latestTimestamp: photo.timestamp };
        }
        if (!confirmedMemoryMap[tag.label].photos.some((p) => p.id === photo.id)) {
          confirmedMemoryMap[tag.label].photos.push(photo);
        }
        if (photo.timestamp > confirmedMemoryMap[tag.label].latestTimestamp) {
          confirmedMemoryMap[tag.label].latestTimestamp = photo.timestamp;
        }
      }
    });
  });

  const recentMemories = Object.entries(confirmedMemoryMap)
    .map(([label, data]) => {
      const firstPhoto = data.photos[0];
      const dateStr = formatShortMonthYear(data.latestTimestamp);

      let icon = 'photo_album';
      const lower = label.toLowerCase();
      if (lower.includes('goa') || lower.includes('beach') || lower.includes('vacation')) icon = 'beach_access';
      else if (lower.includes('job') || lower.includes('work')) icon = 'work';
      else if (lower.includes('city') || lower.includes('move')) icon = 'domain';
      else if (lower.includes('diwali') || lower.includes('celebration')) icon = 'celebration';

      return {
        label,
        photos: data.photos,
        date: dateStr,
        icon,
        image: getPhotoImageUrl(firstPhoto.id),
        latestTimestamp: data.latestTimestamp,
      };
    })
    .sort((a, b) => b.latestTimestamp.localeCompare(a.latestTimestamp));

  const firstSuggestedPhoto = photos.find((p) => p.tags.some((t) => t.status === 'suggested'));
  const firstConfirmedPhoto = photos.find((p) => p.tags.some((t) => t.status === 'confirmed'));

  return (
    <div className="flex flex-col w-full pb-20 select-none">
      {/* Contextual Multi-Select Toolbar Overlay matching GMA_Mobile_UI_V2 */}
      {isSelectionActive && (
        <div className="sticky top-16 z-30 w-full bg-surface-container-lowest shadow-md px-4 py-2.5 flex items-center justify-between border-b border-border-divider animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              aria-label="Deselect all"
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <span className="font-semibold text-sm text-text-primary">{selectedPhotoIds.length} selected</span>
          </div>

          <div className="flex items-center gap-2">
            {/* PROMINENT CLEARLY SEPARATE TAG BUTTON */}
            <button
              onClick={() => onOpenTagEditor('assign')}
              className="h-9 px-3.5 rounded-full bg-blue-tint text-primary font-semibold text-xs flex items-center gap-1.5 border border-primary/20 shadow-xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                label
              </span>
              <span>Tag</span>
            </button>

            {/* Confirm Suggestions if applicable */}
            <button
              onClick={onConfirmSelectedSuggestions}
              className="h-9 px-3 rounded-full bg-primary text-on-primary font-medium text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              title="Confirm suggested tags for selected photos"
            >
              <span className="material-symbols-outlined text-base">check</span>
              <span className="hidden sm:inline">Confirm</span>
            </button>

            {/* Share */}
            <button
              aria-label="Share"
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">share</span>
            </button>

            {/* Delete */}
            <button
              aria-label="Delete"
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:bg-surface-container hover:text-destructive-red transition-colors"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent Memories Story Carousel - ONLY Confirmed Memories Appear */}
      {!isSelectionActive && recentMemories.length > 0 && (
        <section className="mt-2 mb-3 px-2">
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[#5F6368] font-sans tracking-normal">Recent memories</span>
            <button className="text-xs text-primary font-medium hover:underline">View all</button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-1 py-1 scrollbar-none snap-x">
            {recentMemories.map((mem) => {
              const handleMemoryClick = () => {
                // Scope full-screen photo viewer strictly to memory photos when swiping!
                onOpenPhotoViewer(0, mem.photos);
              };

              return (
                <div
                  key={mem.label}
                  onClick={handleMemoryClick}
                  className="relative shrink-0 w-32 h-44 rounded-2xl overflow-hidden shadow-sm cursor-pointer snap-start group transition-transform active:scale-95"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${mem.image}')` }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10"></div>
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex p-1 bg-white/30 backdrop-blur-md rounded-full text-white shadow-xs">
                      <span className="material-symbols-outlined text-[13px]">{mem.icon}</span>
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2 text-white">
                    <p className="text-xs font-semibold leading-tight drop-shadow-sm">{mem.label}</p>
                    <p className="text-[10px] text-white/80 mt-0.5 font-normal">{mem.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Interactive Hint Pill matching GMA_Mobile_UI_V2 */}
      <div className="px-3 mt-1 mb-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-[#efedf1] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">touch_app</span>
            <span className="text-xs text-[#5F6368] font-normal font-sans">Tap to expand, long-press to select photos</span>
          </div>
          <span className="text-[10px] tracking-wide font-medium text-[#5F6368] font-sans uppercase">GRID VIEW</span>
        </div>
      </div>

      {/* Reverse Chronological Photo Timeline (Most recent on top to oldest at bottom) */}
      <div className="flex flex-col gap-5 mt-1">
        {Object.keys(groupedPhotos).length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">No photos found in library.</div>
        ) : (
          Object.entries(groupedPhotos).map(([monthYear, groupList]) => (
            <div key={monthYear} className="flex flex-col">
              {/* Timeline Section Header matching Stitch UI */}
              <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur-md px-4 py-2 flex items-center justify-between">
                <h2 className="text-[17px] font-medium text-[#3C4043] font-sans tracking-tight">{monthYear}</h2>
                <div className="relative flex items-center gap-2">
                  <span className="text-xs text-[#5F6368] font-normal font-sans">
                    {groupList.length} {groupList.length === 1 ? 'item' : 'items'}
                  </span>
                  <button
                    onClick={() => setActiveMenuMonth(activeMenuMonth === monthYear ? null : monthYear)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F6368] hover:bg-surface-container active:bg-surface-container-high transition-colors"
                    aria-label="More options"
                    title="Options"
                  >
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>

                  {/* Contextual Popover Menu matching Stitch */}
                  {activeMenuMonth === monthYear && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setActiveMenuMonth(null)}
                      ></div>
                      <div className="absolute right-0 top-9 z-40 bg-surface-container-lowest rounded-xl shadow-lg border border-border-divider/70 py-1 w-36 animate-in fade-in-50 zoom-in-95 duration-100">
                        <button
                          onClick={() => {
                            const groupIds = groupList.map((p) => p.id);
                            const allSelected = groupIds.every((id) => selectedPhotoIds.includes(id));
                            if (allSelected) {
                              setSelectedPhotoIds((prev) => prev.filter((id) => !groupIds.includes(id)));
                            } else {
                              setSelectedPhotoIds((prev) => Array.from(new Set([...prev, ...groupIds])));
                            }
                            setActiveMenuMonth(null);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base text-primary">
                            {groupList.every((p) => selectedPhotoIds.includes(p.id)) ? 'remove_done' : 'select_all'}
                          </span>
                          <span>
                            {groupList.every((p) => selectedPhotoIds.includes(p.id)) ? 'Deselect all' : 'Select all'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grid: Strictly 3 spacious columns for Mobile App View matching GMA_Mobile_UI_V2 */}
              <div className="grid grid-cols-3 gap-1 px-1 mt-1">
                {groupList.map((photo) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const suggestedTag = photo.tags.find((t) => t.status === 'suggested');
                  const confirmedTag = photo.tags.find((t) => t.status === 'confirmed');

                  const isFirstSuggested = photo.id === firstSuggestedPhoto?.id;
                  const isFirstConfirmed = photo.id === firstConfirmedPhoto?.id;
                  const tourStep3Id = isFirstSuggested ? 'tour-step-3-yellow' : isFirstConfirmed ? 'tour-step-3-green' : undefined;

                  const handlePhotoClick = () => {
                    if (isSelectionActive) {
                      toggleSelectPhoto(photo.id);
                    } else {
                      // Pass groupList or photos scoped to timeline
                      const globalIndex = photos.findIndex((p) => p.id === photo.id);
                      onOpenPhotoViewer(globalIndex !== -1 ? globalIndex : 0);
                    }
                  };

                  return (
                    <div
                      key={photo.id}
                      id={tourStep3Id}
                      onClick={handlePhotoClick}
                      className={`relative aspect-square rounded-md overflow-hidden bg-surface-container cursor-pointer group select-none transition-all shadow-xs ${
                        isSelected ? 'ring-4 ring-primary ring-inset rounded-sm scale-95' : ''
                      }`}
                    >
                      {/* Photo Image */}
                      <img
                        src={getPhotoImageUrl(photo.id)}
                        alt={photo.filename}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Compact Sleek Tag Badges */}
                      {suggestedTag && (
                        <div
                          className="absolute bottom-1.5 left-1.5 max-w-[88%] inline-flex items-center gap-1.5 h-5 bg-[#FEF7E0]/95 backdrop-blur-xs px-2 rounded-full shadow-xs border border-[#FBBC04]/80 pointer-events-none"
                          title={`Suggested Tag: ${suggestedTag.label}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC04] animate-pulse shrink-0"></span>
                          <span className="text-[10px] font-medium text-[#765700] truncate leading-none flex items-center justify-center">{suggestedTag.label}</span>
                        </div>
                      )}

                      {!suggestedTag && confirmedTag && (
                        <div
                          className="absolute bottom-1.5 left-1.5 max-w-[88%] inline-flex items-center gap-1.5 h-5 bg-[#E6F4EA]/95 backdrop-blur-xs px-2 rounded-full shadow-xs pointer-events-none border border-[#34A853]/60"
                          title={`Tag: ${confirmedTag.label}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0"></span>
                          <span className="text-[10px] font-medium text-[#137333] truncate leading-none flex items-center justify-center">{confirmedTag.label}</span>
                        </div>
                      )}

                      {/* Photo Selection Checkmark Circle Button matching Stitch */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectPhoto(photo.id);
                        }}
                        aria-label="Select photo"
                        className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center overflow-hidden transition-all z-10 ${
                          isSelected
                            ? 'bg-[#0058bd] text-white opacity-100 shadow-md scale-100 ring-2 ring-white'
                            : 'bg-black/45 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px] font-bold leading-none select-none">
                          check
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Upload Button in Bottom-Left Corner (Inside Mobile Frame) */}
      <div className="sticky bottom-16 left-4 self-start ml-4 z-40 -mt-14">
        <button
          onClick={onSimulatedUpload}
          aria-label="Upload Photo"
          title="Upload Photo"
          className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#2b66c9] text-white shadow-[0_4px_14px_rgba(43,102,201,0.4)] hover:bg-[#1a55b8] hover:shadow-[0_6px_18px_rgba(43,102,201,0.5)] border border-white/20 flex items-center justify-center transition-all active:scale-90 group"
        >
          <span className="material-symbols-outlined text-2xl font-bold text-white group-hover:scale-110 transition-transform select-none">
            add
          </span>
        </button>
      </div>
    </div>
  );
};
