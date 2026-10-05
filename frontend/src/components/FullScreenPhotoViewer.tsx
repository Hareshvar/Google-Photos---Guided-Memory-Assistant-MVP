import React, { useState, useEffect, useRef } from 'react';
import { Photo } from '../lib/types';
import { getPhotoImageUrl } from '../lib/api';

interface FullScreenPhotoViewerProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onOpenTagEditor: (action?: string, tagLabel?: string) => void;
  onConfirmSuggestion?: (photoId: string, label: string) => Promise<void>;
  onRemoveTag?: (photoId: string, label: string) => Promise<void>;
  onAssignTag?: (photoIds: string[], label: string) => Promise<void>;
}

export const FullScreenPhotoViewer: React.FC<FullScreenPhotoViewerProps> = ({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onSelectIndex,
  onOpenTagEditor,
  onConfirmSuggestion,
  onRemoveTag,
  onAssignTag,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentPhoto = photos[currentIndex];

  // Reset tag sheet state on photo change
  useEffect(() => {
    setIsTagSheetOpen(false);
  }, [currentIndex]);

  // Keyboard navigation listener (Left, Right, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          onSelectIndex(currentIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < photos.length - 1) {
          onSelectIndex(currentIndex + 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onSelectIndex, onClose]);

  if (!isOpen || !currentPhoto) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Horizontal swipe threshold > 40px and more horizontal than vertical
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0 && hasNext) {
        onSelectIndex(currentIndex + 1);
      } else if (deltaX > 0 && hasPrev) {
        onSelectIndex(currentIndex - 1);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleAddCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim() || !onAssignTag) return;
    await onAssignTag([currentPhoto.id], customTagInput.trim());
    setCustomTagInput('');
  };

  const confirmedTags = currentPhoto.tags.filter((t) => t.status === 'confirmed');
  const suggestedTags = currentPhoto.tags.filter((t) => t.status === 'suggested');

  const formattedDate = new Date(currentPhoto.timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center select-none animate-in fade-in duration-200">
      {/* Mobile Frame Container matching GMA_Mobile_UI_V2 photo_viewer_tagging code.html */}
      <div className="w-full max-w-md h-full bg-[#1A1B1E] text-white flex flex-col justify-between overflow-hidden relative shadow-2xl border-x border-white/10">
        {/* Top Floating Scrim & Bar */}
        <div className="sticky top-0 z-40 w-full bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-safe px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              aria-label="Close viewer"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-xs sm:text-sm text-white/95 truncate font-sans">{formattedDate}</span>
              <span className="text-[11px] text-white/60 truncate font-normal font-sans">{currentPhoto.filename}</span>
            </div>
          </div>

          {/* Top Control Action Cluster */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition-all"
              title="Favorite"
            >
              <span
                className={`material-symbols-outlined text-xl ${isFavorite ? 'text-amber-400' : ''}`}
                style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            </button>

            <button
              onClick={() => setIsTagSheetOpen(!isTagSheetOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all ${
                isTagSheetOpen ? 'bg-white/25 text-[#8AB4F8]' : 'text-white'
              }`}
              title="Toggle Memory Tags & Details"
            >
              <span className="material-symbols-outlined text-xl">info</span>
            </button>

            <button
              aria-label="More options"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
          </div>
        </div>

        {/* Main Immersive Stage Area - Photo Fits 100% Perfectly without Cropping */}
        <div
          className="relative flex-1 w-full flex flex-col items-center justify-center my-auto p-3 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Index Badge */}
          <div className="z-30 mb-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white/90 font-medium flex items-center gap-1.5 shadow-sm font-sans shrink-0">
            <span className="material-symbols-outlined text-sm text-[#8AB4F8]">photo_library</span>
            <span>
              Photo {currentIndex + 1} of {photos.length}
            </span>
          </div>

          {/* Visible Left Arrow Navigation Button */}
          {hasPrev && (
            <button
              onClick={() => onSelectIndex(currentIndex - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-md active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">chevron_left</span>
            </button>
          )}

          {/* Visible Right Arrow Navigation Button */}
          {hasNext && (
            <button
              onClick={() => onSelectIndex(currentIndex + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-md active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">chevron_right</span>
            </button>
          )}

          {/* Focal Hero Photo Card: Fitted Perfectly with object-contain */}
          <div className="relative z-20 w-full flex-1 flex items-center justify-center max-h-[64vh] px-2 py-1">
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={getPhotoImageUrl(currentPhoto.id)}
                alt={currentPhoto.filename}
                className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 transition-transform duration-300"
              />

              {/* Confirmed Tag Overlay Badge on Photo */}
              {confirmedTags.length > 0 && (
                <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-xs shadow-md font-sans">
                  <span className="material-symbols-outlined text-[#34A853] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span className="font-medium text-white">{confirmedTags[0].label}</span>
                </div>
              )}

              {/* Suggested Tag Overlay Badge on Photo with Direct Confirm (Tick) & Dismiss (Cross) Buttons */}
              {suggestedTags.length > 0 && confirmedTags.length === 0 && (
                <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 bg-[#FEF7E0]/95 backdrop-blur-md border border-[#FBBC04]/60 px-3.5 py-1.5 rounded-full text-[#1a1b1e] text-xs shadow-lg font-sans animate-in fade-in zoom-in duration-200">
                  <span className="material-symbols-outlined text-[#FBBC04] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                  <span className="font-semibold text-[#1a1b1e]">{suggestedTags[0].label}</span>
                  
                  <div className="flex items-center gap-1.5 ml-1">
                    {/* Tick / Confirm Icon Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (onConfirmSuggestion) {
                          await onConfirmSuggestion(currentPhoto.id, suggestedTags[0].label);
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-[#0058bd] hover:bg-[#004494] text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                      title="Confirm suggestion (Tick)"
                    >
                      <span className="material-symbols-outlined text-xs font-bold">check</span>
                    </button>

                    {/* Cross / Dismiss Icon Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (onRemoveTag) {
                          await onRemoveTag(currentPhoto.id, suggestedTags[0].label);
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-[#EA4335]/20 hover:bg-[#EA4335] text-[#EA4335] hover:text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                      title="Dismiss suggestion (Cross)"
                    >
                      <span className="material-symbols-outlined text-xs font-bold">close</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Viewer Dark Bottom Action Bar matching Stitch code.html */}
        <div className="w-full bg-[#1A1B1E] text-white p-3 z-40 border-t border-white/10 shrink-0">
          <div className="w-full flex items-center justify-around">
            {/* Share */}
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">share</span>
              <span className="text-[11px] font-medium font-sans">Share</span>
            </button>

            {/* Edit */}
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">tune</span>
              <span className="text-[11px] font-medium font-sans">Edit</span>
            </button>

            {/* PROMINENT TAG PHOTO BUTTON (Toggles Expandable Tag Sheet) */}
            <button
              id="tour-step-4"
              onClick={() => setIsTagSheetOpen(!isTagSheetOpen)}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-full font-semibold text-xs transition-all shadow-md active:scale-95 ${
                isTagSheetOpen
                  ? 'bg-[#0058bd] text-white'
                  : 'bg-[#E8F0FE] text-[#0058bd] hover:bg-[#d8e2ff]'
              }`}
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                label
              </span>
              <span className="font-sans">Tag photo</span>
            </button>

            {/* Lens */}
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">camera_alt</span>
              <span className="text-[11px] font-medium font-sans">Lens</span>
            </button>

            {/* Delete */}
            <button className="flex flex-col items-center gap-1 text-white/80 hover:text-red-400 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">delete</span>
              <span className="text-[11px] font-medium font-sans">Delete</span>
            </button>
          </div>
        </div>

        {/* Expandable White Bottom Sheet: Memory Tags & Context (Appears when Tag photo is clicked) */}
        {isTagSheetOpen && (
          <div className="absolute inset-x-0 bottom-0 z-50 bg-surface-container-lowest text-on-surface rounded-t-3xl shadow-2xl p-4 border-t border-border-divider animate-in slide-in-from-bottom duration-250 max-h-[70vh] overflow-y-auto">
            <div className="w-full flex flex-col gap-4">
              {/* Grabber Header & Title Bar */}
              <div className="flex flex-col items-center w-full">
                <button
                  onClick={() => setIsTagSheetOpen(false)}
                  className="w-12 h-1.5 rounded-full bg-surface-container-highest mb-3 hover:bg-surface-container-high transition-colors"
                  aria-label="Close tag details"
                ></button>
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0058bd] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      auto_awesome
                    </span>
                    <span className="font-semibold text-base text-on-surface font-sans">Memory Tags & Context</span>
                  </div>
                  <span className="text-xs text-text-secondary bg-surface-container-high px-2.5 py-0.5 rounded-full font-medium font-sans">
                    {confirmedTags.length + suggestedTags.length} Active
                  </span>
                </div>
              </div>

              {/* Photo Metadata & Associated Tags Sheet Section */}
              <div className="flex flex-col gap-3.5 pt-1">
                {/* Confirmed Tags */}
                {confirmedTags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans">
                      Associated with this photo
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {confirmedTags.map((tag) => (
                        <div
                          key={tag.label}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-medium shadow-xs"
                        >
                          <span className="material-symbols-outlined text-xs text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                          <span className="font-sans">{tag.label}</span>
                          {onRemoveTag && (
                            <button
                              onClick={() => onRemoveTag(currentPhoto.id, tag.label)}
                              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-emerald-200 text-emerald-700 ml-0.5"
                              title="Remove tag"
                            >
                              <span className="material-symbols-outlined text-[10px]">close</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggested Tags with Tick (Confirm) and Cross (Dismiss) buttons */}
                {suggestedTags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans">
                        Suggested AI Life Stages
                      </span>
                      <span className="text-[10px] font-medium text-amber-600 flex items-center gap-0.5 font-sans">
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        AI Powered
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {suggestedTags.map((tag) => (
                        <div
                          key={tag.label}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-medium shadow-xs font-sans"
                        >
                          <span className="material-symbols-outlined text-amber-500 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                            auto_awesome
                          </span>
                          <span className="font-semibold">{tag.label}</span>
                          <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.2 rounded-full font-medium text-amber-800 font-sans mr-0.5">
                            Suggested
                          </span>

                          {/* Tick Confirm */}
                          <button
                            onClick={() => onConfirmSuggestion && onConfirmSuggestion(currentPhoto.id, tag.label)}
                            className="w-5 h-5 rounded-full bg-[#0058bd] text-white flex items-center justify-center hover:bg-[#004494] active:scale-95 transition-all shadow-2xs"
                            title="Confirm suggestion (Tick)"
                          >
                            <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                          </button>

                          {/* Cross Dismiss */}
                          <button
                            onClick={() => onRemoveTag && onRemoveTag(currentPhoto.id, tag.label)}
                            className="w-5 h-5 rounded-full bg-red-100 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center active:scale-95 transition-all shadow-2xs"
                            title="Dismiss suggestion (Cross)"
                          >
                            <span className="material-symbols-outlined text-[11px] font-bold">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Add Custom Tag Input */}
                <form onSubmit={handleAddCustomTag} className="flex items-center gap-2 mt-2">
                  <div className="flex-1 flex items-center gap-2 bg-surface-container-low rounded-full px-3.5 py-2 border border-border-divider/80 focus-within:border-primary">
                    <span className="material-symbols-outlined text-outline text-base shrink-0">sell</span>
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      placeholder="Add life stage or tag..."
                      className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-secondary focus:outline-none font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customTagInput.trim()}
                    className="w-9 h-9 rounded-full bg-[#0058bd] text-white flex items-center justify-center disabled:opacity-40 transition-all shadow-md shrink-0 active:scale-90"
                    title="Add tag"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_upward</span>
                  </button>
                </form>

                {/* Quick Add Existing Tags Chips */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans">
                    Tag with existing life stage:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Started New Job', 'Moved to New City', 'Goa Trip', 'Diwali 2023'].map((tagLabel) => {
                      const isTagged = currentPhoto.tags.some((t) => t.label === tagLabel);
                      if (isTagged) return null;
                      return (
                        <button
                          key={tagLabel}
                          type="button"
                          onClick={async () => {
                            if (onAssignTag) {
                              await onAssignTag([currentPhoto.id], tagLabel);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0058bd] border border-[#adc6ff] hover:bg-[#d8e2ff] text-xs font-medium active:scale-95 transition-all shadow-xs font-sans"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          <span>{tagLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
