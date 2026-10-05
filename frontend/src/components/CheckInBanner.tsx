import React from 'react';

interface CheckInBannerProps {
  show: boolean;
  suggestedTag?: string;
  photoCount: number;
  onDismiss: () => void;
  onConfirm: () => void;
}

export const CheckInBanner: React.FC<CheckInBannerProps> = ({
  show,
  suggestedTag,
  photoCount,
  onDismiss,
  onConfirm,
}) => {
  if (!show || !suggestedTag) return null;

  return (
    <section id="tour-step-1" className="px-3 pt-2 pb-1 transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-4 shadow-sm border border-border-divider/50">
        {/* Subtle Ambient Decorative Circle */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full pointer-events-none"></div>

        <div className="flex items-start gap-3">
          {/* Left Sparkle Icon Badge matching Stitch Image */}
          <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#1b66c9] flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-xl text-[#1b66c9]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 pr-5">
            {/* Header Badge: ALL UPPERCASE + Yellow Dot matching Stitch Image */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm sm:text-[15px] font-bold text-[#1b66c9] tracking-wider uppercase font-sans">
                LIFE STAGE DETECTED
              </span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FBBC04] shrink-0 shadow-xs"></span>
            </div>

            {/* Description Text */}
            <p className="text-sm text-on-surface leading-snug font-sans">
              We noticed {photoCount} photos at <span className="font-semibold text-on-surface">{suggestedTag}</span> — want to tag this as a life stage?
            </p>

            {/* Action Buttons matching Stitch Design */}
            <div className="mt-3 flex items-center flex-wrap gap-2">
              <button
                onClick={onConfirm}
                className="h-9 px-4 rounded-full bg-[#0058bd] hover:bg-[#004bb0] text-white font-medium text-xs flex items-center justify-center shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
              >
                <span className="whitespace-nowrap">Review</span>
              </button>

              <button
                onClick={onDismiss}
                className="h-9 px-3.5 rounded-full bg-surface-container text-on-surface-variant font-medium text-xs hover:bg-surface-container-high active:scale-95 transition-all text-center whitespace-nowrap shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Top-Right Dismiss X Icon */}
          <button
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="absolute top-3 right-3 text-text-secondary hover:text-text-primary p-1 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </section>
  );
};
