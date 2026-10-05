import React, { useState } from 'react';
import { Photo } from '../lib/types';
import { getPhotoImageUrl } from '../lib/api';

interface LifeStagesViewProps {
  photos: Photo[];
  onManageTag: (tagLabel: string) => void;
  onOpenTagEditor: (action: string, tagLabel?: string) => void;
  onOpenPhotoViewer?: (index: number, customPhotos?: Photo[]) => void;
  onConfirmSuggestion?: (photoId: string, tagLabel: string) => Promise<void> | void;
  onRemoveTag?: (photoId: string, tagLabel: string) => Promise<void> | void;
}

export const LifeStagesView: React.FC<LifeStagesViewProps> = ({
  photos,
  onManageTag,
  onOpenTagEditor,
  onOpenPhotoViewer,
  onConfirmSuggestion,
  onRemoveTag,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Per-chapter session confirmation toast & dismissed state
  const [justConfirmedToast, setJustConfirmedToast] = useState<Record<string, boolean>>({});
  const [dismissedChapters, setDismissedChapters] = useState<Record<string, boolean>>({});

  // Filter photos for main predefined chapters (relying strictly on active photo tags)
  const newJobPhotos = photos.filter((p) => p.tags.some((t) => t.label === 'Started New Job'));
  const newCityPhotos = photos.filter((p) => p.tags.some((t) => t.label === 'Moved to New City'));
  const goaPhotos = photos.filter((p) => p.tags.some((t) => t.label.toLowerCase().includes('goa')));

  const uniquePhotos = (arr: Photo[]) => Array.from(new Map(arr.map((item) => [item.id, item])).values());
  const realJobPhotos = uniquePhotos(newJobPhotos);
  const realCityPhotos = uniquePhotos(newCityPhotos);
  const realGoaPhotos = uniquePhotos(goaPhotos);

  // Group dynamic user tags
  const tagGroups: { [key: string]: Photo[] } = {};
  photos.forEach((photo) => {
    photo.tags.forEach((tag) => {
      if (!tagGroups[tag.label]) {
        tagGroups[tag.label] = [];
      }
      if (!tagGroups[tag.label].some((p) => p.id === photo.id)) {
        tagGroups[tag.label].push(photo);
      }
    });
  });

  const toggleMenu = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === menuId ? null : menuId));
  };

  const closeMenus = () => {
    if (activeMenuId) setActiveMenuId(null);
  };

  const handleConfirmAllInChapter = async (tagLabel: string, chapterPhotos: Photo[]) => {
    setJustConfirmedToast((prev) => ({ ...prev, [tagLabel]: true }));
    if (onConfirmSuggestion && chapterPhotos.length > 0) {
      for (const p of chapterPhotos) {
        for (const t of p.tags) {
          if (t.label === tagLabel && t.status === 'suggested') {
            await onConfirmSuggestion(p.id, t.label);
          }
        }
      }
    }
  };

  const handleDismissPendingInChapter = async (tagLabel: string, pendingPhotos: Photo[]) => {
    if (onRemoveTag && pendingPhotos.length > 0) {
      for (const p of pendingPhotos) {
        await onRemoveTag(p.id, tagLabel);
      }
    } else {
      setDismissedChapters((prev) => ({ ...prev, [tagLabel]: true }));
    }
  };

  // Helper function to render a Chapter Card cleanly
  const renderChapterCard = (
    tagLabel: string,
    chapterPhotos: Photo[],
    subtitle: string,
    menuId: string
  ) => {
    if (dismissedChapters[tagLabel]) return null;

    // Filter confirmed & suggested photos for this specific chapter tag
    const confirmedPhotos = chapterPhotos.filter((p) =>
      p.tags.some((t) => t.label === tagLabel && t.status === 'confirmed')
    );
    const suggestedPhotos = chapterPhotos.filter((p) =>
      p.tags.some((t) => t.label === tagLabel && t.status === 'suggested')
    );

    // If no photos at all for this tag, hide card
    if (chapterPhotos.length === 0) return null;
    // If user has 0 confirmed and 0 suggested (all removed/dismissed), hide card
    if (confirmedPhotos.length === 0 && suggestedPhotos.length === 0) return null;

    const hasPending = suggestedPhotos.length > 0;
    const isFullyConfirmed = !hasPending && confirmedPhotos.length > 0;

    // Photos to display in the thumbnail grid:
    // If there are confirmed photos, show ONLY the confirmed photos under this life stage.
    // If 0 confirmed photos exist yet, show suggested photos for review.
    const displayPhotos = confirmedPhotos.length > 0 ? confirmedPhotos : suggestedPhotos;

    return (
      <section
        key={tagLabel}
        className="mx-4 rounded-2xl bg-white p-4 shadow-sm border border-[#efedf1] transition-all duration-300 relative"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div
              id={menuId === sortedChapters[0]?.menuId ? 'tour-step-4' : undefined}
              className="flex items-center gap-2 flex-wrap mb-1 p-1 rounded-xl bg-white/80"
            >
              <h2 className="text-[18px] leading-[24px] font-medium text-[#202124] truncate">{tagLabel}</h2>
              {/* Stage Chip Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isFullyConfirmed || confirmedPhotos.length > 0
                    ? 'bg-[#E6F4EA] text-[#005320]'
                    : 'bg-[#FEF7E0] text-[#1a1b1e]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[13px] ${
                    isFullyConfirmed || confirmedPhotos.length > 0 ? 'text-[#34A853]' : 'text-[#FBBC04]'
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isFullyConfirmed || confirmedPhotos.length > 0 ? 'check_circle' : 'arrow_back_ios_new'}
                </span>
                <span>{isFullyConfirmed || confirmedPhotos.length > 0 ? 'Confirmed' : 'Suggested Stage'}</span>
              </span>
            </div>
            <p className="text-sm text-[#5F6368] font-normal">
              {confirmedPhotos.length > 0
                ? `${confirmedPhotos.length} confirmed • ${subtitle}`
                : `${chapterPhotos.length} photos • ${subtitle}`}
            </p>
          </div>

          {/* Overflow menu */}
          <div className="relative">
            <button
              aria-label="More options"
              onClick={(e) => toggleMenu(menuId, e)}
              className="p-1.5 rounded-full text-[#5F6368] hover:bg-[#efedf1] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
            {activeMenuId === menuId && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl z-20 py-1.5 flex flex-col border border-[#efedf1]">
                <button
                  onClick={() => onOpenTagEditor('rename', tagLabel)}
                  className="w-full text-left px-4 py-2 hover:bg-[#efedf1] text-sm text-[#202124] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg text-[#5F6368]">edit</span>
                  Rename
                </button>
                <button
                  onClick={() => onOpenTagEditor('merge', tagLabel)}
                  className="w-full text-left px-4 py-2 hover:bg-[#efedf1] text-sm text-[#202124] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg text-[#5F6368]">call_merge</span>
                  Merge chapter
                </button>
                <button
                  onClick={() => onOpenTagEditor('delete', tagLabel)}
                  className="w-full text-left px-4 py-2 hover:bg-[#efedf1] text-sm text-[#EA4335] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg text-[#EA4335]">delete</span>
                  Delete tag group
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pending Suggestion Banner - Stays visible as long as suggestedPhotos.length > 0 */}
        {hasPending && (
          <div className="bg-[#FEF7E0] rounded-2xl p-3 flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FBBC04] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                hotel_class
              </span>
              <span className="text-sm font-medium text-[#202124]">
                {suggestedPhotos.length} candid moment{suggestedPhotos.length > 1 ? 's' : ''} await confirmation
              </span>
            </div>
            <button
              onClick={() => onOpenPhotoViewer && onOpenPhotoViewer(0, suggestedPhotos)}
              className="text-xs font-semibold text-[#0058bd] hover:underline"
            >
              Review
            </button>
          </div>
        )}

        {/* Photo Grid - Displays ONLY confirmed photos under the tag (or suggested if none confirmed) */}
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
          {displayPhotos.slice(0, 3).map((p, idx) => {
            const isPhotoSuggested = p.tags.some((t) => t.label === tagLabel && t.status === 'suggested');
            return (
              <div
                key={p.id}
                onClick={() => onOpenPhotoViewer && onOpenPhotoViewer(idx, displayPhotos)}
                className="relative aspect-square group overflow-hidden rounded-2xl bg-[#efedf1] cursor-pointer"
              >
                <img
                  alt={p.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src={getPhotoImageUrl(p.id)}
                />
                {/* ONLY render overlay badge if photo is still SUGGESTED. Confirmed photos stay clean! */}
                {isPhotoSuggested && (
                  <div className="absolute inset-x-1 bottom-1 flex justify-center">
                    <span className="inline-flex items-center gap-1 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-medium shadow-sm bg-[#FEF7E0]/95 text-[#1a1b1e]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC04]"></span>
                      Suggested
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending Action Bar */}
        {hasPending ? (
          <div className="mt-3 pt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => handleDismissPendingInChapter(tagLabel, suggestedPhotos)}
              className="px-3.5 py-2 rounded-full text-sm font-medium text-[#EA4335] bg-[#FCE8E6] active:scale-95 transition-transform flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Dismiss
            </button>
            <button
              onClick={() => handleConfirmAllInChapter(tagLabel, chapterPhotos)}
              className="px-4 py-2 rounded-full text-sm font-medium text-white bg-[#0058bd] shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Confirm
            </button>
          </div>
        ) : (
          /* Render green toast banner ONLY IF user just confirmed in current session */
          justConfirmedToast[tagLabel] && (
            <div className="mt-3 p-2.5 bg-[#E6F4EA] text-[#005320] rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[#34A853] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="text-xs font-medium text-[#34A853]">Added to your Life Stages! Timeline updated.</span>
            </div>
          )
        )}
      </section>
    );
  };

  const formatMonthYear = (timestamp: string): string => {
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

  // Helper to find latest photo timestamp in a chapter
  const getLatestTimestamp = (chapterPhotos: Photo[]): string => {
    if (!chapterPhotos || chapterPhotos.length === 0) return '0000-00-00';
    return chapterPhotos.reduce((max, p) => (p.timestamp > max ? p.timestamp : max), chapterPhotos[0].timestamp);
  };

  // Build sorted chapter list (reverse chronological order: newest timestamp first)
  const sortedChapters = [
    {
      label: 'Started New Job',
      photos: realJobPhotos,
      subtitle: 'December 2025 • Life Milestone',
      menuId: 'menu-job',
      latestTimestamp: getLatestTimestamp(realJobPhotos),
    },
    {
      label: 'Goa Trip',
      photos: realGoaPhotos,
      subtitle: 'June 2024 • North Goa beaches',
      menuId: 'menu-goa',
      latestTimestamp: getLatestTimestamp(realGoaPhotos),
    },
    {
      label: 'Moved to New City',
      photos: realCityPhotos,
      subtitle: 'Key milestone • Aug 2023',
      menuId: 'menu-city',
      latestTimestamp: getLatestTimestamp(realCityPhotos),
    },
    ...Object.keys(tagGroups)
      .filter((label) => !['Started New Job', 'Moved to New City', 'Goa Trip'].includes(label))
      .map((label) => {
        const latestTs = getLatestTimestamp(tagGroups[label]);
        const formattedDate = formatMonthYear(latestTs);
        return {
          label,
          photos: tagGroups[label],
          subtitle: `${formattedDate} • Memory Chapter`,
          menuId: `menu-${label}`,
          latestTimestamp: latestTs,
        };
      }),
  ].sort((a, b) => b.latestTimestamp.localeCompare(a.latestTimestamp));

  // Calculate total visible chapters count
  let visibleCount = 0;
  if (realJobPhotos.length > 0 && !dismissedChapters['Started New Job']) visibleCount++;
  if (realCityPhotos.length > 0 && !dismissedChapters['Moved to New City']) visibleCount++;
  if (realGoaPhotos.length > 0 && !dismissedChapters['Goa Trip']) visibleCount++;
  Object.keys(tagGroups).forEach((key) => {
    if (!['Started New Job', 'Moved to New City', 'Goa Trip'].includes(key) && !dismissedChapters[key]) {
      visibleCount++;
    }
  });

  return (
    <div className="flex flex-col w-full pb-24 select-none min-h-screen bg-[#faf9fd]" onClick={closeMenus}>
      {/* Page Context & Memory Curation Header */}
      <section id="tour-step-5" className="px-4 pt-4 pb-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#0058bd] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_stories
            </span>
            <span className="text-xs font-semibold text-[#0058bd] tracking-wide uppercase">Timeline Chapters</span>
          </div>
          <span className="text-xs font-medium text-[#5F6368] bg-[#efedf1] px-2.5 py-0.5 rounded-full">
            {visibleCount} Chapters
          </span>
        </div>
        <h1 className="text-[24px] leading-[32px] font-medium text-[#202124] tracking-tight mt-1">Life Stages &amp; Chapters</h1>
        <p className="text-[14px] leading-[20px] text-[#5F6368] font-normal">Photos automatically grouped by memories, chapters, and events</p>
      </section>

      {/* Memory Timeline Container */}
      <div className="flex flex-col gap-6 pb-6">
        {/* Render Chapters in Reverse Chronological Order */}
        {sortedChapters.map((chap) =>
          renderChapterCard(chap.label, chap.photos, chap.subtitle, chap.menuId)
        )}

        {/* Warm Human Note / Chapter Prompt Card */}
        <div className="mx-4 bg-[#E8F0FE] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0058bd] flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-xl text-[#0058bd]" style={{ fontVariationSettings: "'FILL' 1" }}>
              psychology_alt
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[#202124]">Missing a life event?</h3>
            <p className="text-xs text-[#5F6368] font-normal mt-0.5">
              Ask Memories to cluster your first job, moving to Bangalore, or road trips.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
