import React, { useEffect, useState, useLayoutEffect } from 'react';

export interface TourStep {
  stepNumber: number;
  targetId: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    stepNumber: 1,
    targetId: 'tour-step-1',
    title: 'We noticed something new',
    body: "When your photos' dates line up with signals like your calendar, email bookings, or location changes, we'll suggest a life stage -- like 'Started New Job' or 'Goa Trip.' You decide whether to confirm it.",
  },
  {
    stepNumber: 2,
    targetId: 'tour-step-2',
    title: "Can't remember exact details?",
    body: "Tap Memory to talk to the Guided Memory Assistant. Describe what you remember -- a feeling, a trip, a time in your life -- and it'll help you find the photo, even without the right keywords.",
  },
  {
    stepNumber: 3,
    targetId: 'tour-step-3',
    title: 'Suggested vs. Confirmed',
    body: "Dashed yellow means we've detected a possible life stage, but nothing's confirmed yet -- it's just a suggestion. Solid green means a tag has been approved, either by you or because you accepted a suggestion.",
  },
  {
    stepNumber: 4,
    targetId: 'tour-step-4',
    title: 'Try tagging a photo',
    body: "Tap any photo to open it, then tap Tag here. Pick an existing life stage or type a new one, then confirm -- that's it. You can also select several photos at once from the grid first (long-press one, then drag across others) and tag them all together in one go.",
  },
  {
    stepNumber: 5,
    targetId: 'tour-step-5',
    title: 'Your photos, organized by life stage',
    body: 'This is where all your tagged life stages live, grouped into chapters you can browse anytime.',
  },
];

interface ProductTourProps {
  isOpen: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({
  isOpen,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 16 });

  const step = TOUR_STEPS.find((s) => s.stepNumber === currentStep) || TOUR_STEPS[0];

  // Auto-scroll logic for steps to ensure target element is cleanly in viewport
  useEffect(() => {
    if (isOpen) {
      if (currentStep === 1 || currentStep === 2) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (currentStep === 3) {
        const scrollTimer = setTimeout(() => {
          const elemYellow = document.getElementById('tour-step-3-yellow');
          if (elemYellow) {
            elemYellow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            window.scrollTo({ top: 250, behavior: 'smooth' });
          }
        }, 50);
        return () => clearTimeout(scrollTimer);
      }
    }
  }, [isOpen, currentStep]);

  const updateTargetRect = () => {
    if (!isOpen) return;

    if (step.targetId === 'tour-step-3') {
      const elemYellow = document.getElementById('tour-step-3-yellow');
      const elemGreen = document.getElementById('tour-step-3-green');
      if (elemYellow && elemGreen) {
        const rectY = elemYellow.getBoundingClientRect();
        const rectG = elemGreen.getBoundingClientRect();

        const top = Math.min(rectY.top, rectG.top);
        const left = Math.min(rectY.left, rectG.left);
        const right = Math.max(rectY.right, rectG.right);
        const bottom = Math.max(rectY.bottom, rectG.bottom);

        const combinedRect = new DOMRect(left, top, right - left, bottom - top);
        setTargetRect(combinedRect);

        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - combinedRect.bottom;

        if (spaceBelow > 240 || combinedRect.top < 180) {
          setTooltipPos({
            top: Math.min(combinedRect.bottom + 12, viewportHeight - 250),
            left: Math.max(16, Math.min(combinedRect.left, window.innerWidth - 340)),
          });
        } else {
          setTooltipPos({
            bottom: Math.min(viewportHeight - combinedRect.top + 12, viewportHeight - 100),
            left: Math.max(16, Math.min(combinedRect.left, window.innerWidth - 340)),
          });
        }
        return;
      }
    }

    const elem = document.getElementById(step.targetId);
    if (elem) {
      let rect = elem.getBoundingClientRect();
      if ((currentStep === 1 || currentStep === 2) && rect.top < 50) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        rect = elem.getBoundingClientRect();
      }
      setTargetRect(rect);

      // Compute tooltip placement within screen boundaries
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;

      // Position card below element if space allows, otherwise above
      if (spaceBelow > 240 || rect.top < 180) {
        setTooltipPos({
          top: Math.min(rect.bottom + 12, viewportHeight - 250),
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
        });
      } else {
        setTooltipPos({
          bottom: Math.min(viewportHeight - rect.top + 12, viewportHeight - 100),
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
        });
      }
    } else {
      setTargetRect(null);
    }
  };

  useLayoutEffect(() => {
    updateTargetRect();
    const t1 = setTimeout(updateTargetRect, 100);
    const t2 = setTimeout(updateTargetRect, 250);
    const t3 = setTimeout(updateTargetRect, 450);
    const t4 = setTimeout(updateTargetRect, 700);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, currentStep, step.targetId]);

  if (!isOpen) return null;

  const totalSteps = TOUR_STEPS.length;
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center select-none overflow-hidden">
      {/* Clickable backdrop overlay to skip when clicking outside */}
      <div
        className="absolute inset-0 bg-black/45 transition-opacity duration-500 ease-in-out"
        onClick={onSkip}
      />

      {/* Spotlight Box around target element: completely clear, sharp, unblurred & highlighted */}
      {targetRect && (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-500 ease-in-out ring-4 ring-[#1b66c9] shadow-[0_0_0_9999px_rgba(0,0,0,0.50),0_0_25px_rgba(27,102,201,0.6)] z-[101]"
          style={{
            top: Math.max(8, targetRect.top - 6),
            left: Math.max(8, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Product Tour Tooltip Card */}
      <div
        className="fixed z-[102] w-[calc(100vw-32px)] max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-[#dadce0] transition-all duration-400 ease-in-out animate-in fade-in zoom-in-95"
        style={{
          top: tooltipPos.top !== undefined ? `${tooltipPos.top}px` : undefined,
          bottom: tooltipPos.bottom !== undefined ? `${tooltipPos.bottom}px` : undefined,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Card Header: Explicit "Product Tour" Badge, Step Counter, Dismiss Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 bg-[#E8F0FE] text-[#1b66c9] px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
            <span className="material-symbols-outlined text-sm text-[#FBBC04]" style={{ fontVariationSettings: "'FILL' 1" }}>
              explore
            </span>
            <span>Product Tour • {step.stepNumber} of {totalSteps}</span>
          </div>

          <button
            onClick={onSkip}
            aria-label="Close product tour"
            className="p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-container-high transition-colors"
            title="Skip Product Tour"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-text-primary tracking-tight mb-2 font-sans">
          {step.title}
        </h3>

        {/* Body Copy */}
        <p className="text-xs text-on-surface-variant leading-relaxed mb-5 font-sans">
          {step.body}
        </p>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-divider/40">
          <div>
            {!isLastStep && (
              <button
                onClick={onSkip}
                className="text-xs font-medium text-text-secondary hover:text-text-primary px-2 py-1 rounded transition-colors"
              >
                Skip tour
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high active:scale-95 transition-all"
              >
                Back
              </button>
            )}

            <button
              onClick={isLastStep ? onComplete : onNext}
              className="px-4 py-1.5 rounded-full bg-[#0058bd] hover:bg-[#004bb0] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <span>{isLastStep ? 'Got it' : 'Next'}</span>
              {!isLastStep && <span className="material-symbols-outlined text-sm">chevron_right</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
