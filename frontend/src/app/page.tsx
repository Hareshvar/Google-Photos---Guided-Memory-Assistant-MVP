'use client';

import React, { useState, useEffect } from 'react';
import { Photo } from '../lib/types';
import { usePhotos } from '../hooks/usePhotos';
import { useCheckIn } from '../hooks/useCheckIn';
import { Header } from '../components/Header';
import { BottomNav, NavTab } from '../components/BottomNav';
import { CheckInBanner } from '../components/CheckInBanner';
import { LibraryView } from '../components/LibraryView';
import { LifeStagesView } from '../components/LifeStagesView';
import { GuidedRetrievalChat } from '../components/GuidedRetrievalChat';
import { TagEditorDrawer } from '../components/TagEditorDrawer';
import { FullScreenPhotoViewer } from '../components/FullScreenPhotoViewer';
import { ProductTour } from '../components/ProductTour';

export default function Home() {
  const {
    photos,
    loading,
    error,
    refreshPhotos,
    resetPhotos,
    assignTag,
    confirmSuggestion,
    renameTag,
    removePhotoTag,
    mergeTags,
    deleteTagGroup,
    bulkTagRange,
    simulatedUpload,
  } = usePhotos();

  const {
    showBanner,
    bannerState,
    dismissBanner,
    confirmBannerTag,
    refreshCheckIn,
  } = useCheckIn();

  const [activeTab, setActiveTab] = useState<NavTab>('photos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  // Guided Product Tour State
  const [tourOpen, setTourOpen] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(1);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('gma_product_tour_completed');
    if (!tourCompleted) {
      setTourOpen(true);
      setTourStep(1);
    }
  }, []);

  // Reset window scroll position to top whenever switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const handleStartTour = () => {
    setActiveTab('photos');
    setViewerOpen(false);
    setTourStep(1);
    setTourOpen(true);
  };

  const handleNextTourStep = () => {
    if (tourStep === 1) {
      setTourStep(2);
    } else if (tourStep === 2) {
      setTourStep(3);
    } else if (tourStep === 3) {
      setActiveTab('photos');
      setViewerOpen(true);
      setActivePhotoIndex(0);
      setTourStep(4);
    } else if (tourStep === 4) {
      setViewerOpen(false);
      setActiveTab('photos');
      setTourStep(5);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrevTourStep = () => {
    if (tourStep === 5) {
      setActiveTab('photos');
      setViewerOpen(true);
      setTourStep(4);
    } else if (tourStep === 4) {
      setViewerOpen(false);
      setActiveTab('photos');
      setTourStep(3);
    } else if (tourStep === 3) {
      setTourStep(2);
    } else if (tourStep === 2) {
      setTourStep(1);
    }
  };

  const handleSkipTour = () => {
    localStorage.setItem('gma_product_tour_completed', 'true');
    setViewerOpen(false);
    setActiveTab('photos');
    setTourOpen(false);
  };

  const handleCompleteTour = () => {
    localStorage.setItem('gma_product_tour_completed', 'true');
    setViewerOpen(false);
    setActiveTab('photos');
    setTourOpen(false);
  };

  // Full Screen Photo Viewer State
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [viewerPhotos, setViewerPhotos] = useState<Photo[]>([]);

  const filteredPhotos = searchQuery.trim()
    ? photos.filter((p) => {
        const query = searchQuery.toLowerCase();
        const matchesTag = p.tags.some((t) => t.label.toLowerCase().includes(query));
        const matchesDate = p.timestamp.includes(query);
        return matchesTag || matchesDate;
      })
    : photos;

  // Keep viewerPhotos synced with latest photos array from hook
  const effectiveViewerPhotos =
    viewerPhotos.length > 0
      ? viewerPhotos.map((vp) => photos.find((p) => p.id === vp.id) || vp)
      : filteredPhotos;

  // Tag Editor Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerAction, setDrawerAction] = useState<string>('assign');
  const [activeTagLabel, setActiveTagLabel] = useState<string>('');

  const handleOpenPhotoViewer = (index: number = 0, customPhotos?: Photo[]) => {
    setViewerPhotos(customPhotos || photos);
    setActivePhotoIndex(index);
    setViewerOpen(true);
  };

  const handleOpenTagEditor = (action: string = 'assign', tagLabel: string = '') => {
    setDrawerAction(action);
    setActiveTagLabel(tagLabel);
    setDrawerOpen(true);
  };

  const handleConfirmSelectedSuggestions = async () => {
    if (selectedPhotoIds.length === 0) return;
    for (const pid of selectedPhotoIds) {
      const p = photos.find((item) => item.id === pid);
      if (p) {
        for (const t of p.tags) {
          if (t.status === 'suggested') {
            await confirmSuggestion(pid, t.label);
          }
        }
      }
    }
    setSelectedPhotoIds([]);
    await refreshPhotos();
    await refreshCheckIn();
  };


  return (
    <div className="flex flex-col min-h-screen w-full bg-surface">
      {/* Mobile Device Viewport */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-surface relative flex flex-col">
        {/* Mobile Top Header */}
        <Header
          onOpenChat={() => setActiveTab('chat')}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onStartTour={handleStartTour}
        />

        {/* Main Viewport Container */}
        <main className="flex-1 w-full bg-surface flex flex-col">
          <div className="w-full px-0 py-2 min-h-[90vh] bg-surface">
          {/* Loading / Error state */}
          {loading && photos.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant text-sm gap-2">
              <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
              <span>Loading photo library...</span>
            </div>
          )}

          {error && (
            <div className="m-4 p-3 bg-error-container text-on-error-container rounded-xl text-xs">
              {error}. Ensure Python FastAPI backend is running on http://localhost:8000.
            </div>
          )}

          {/* Tab 1: Guided Search Chat View */}
          {activeTab === 'chat' && (
            <GuidedRetrievalChat
              onClose={() => setActiveTab('photos')}
              onOpenPhotoViewer={handleOpenPhotoViewer}
            />
          )}

          {/* Tab 2: Photos Library View */}
          {activeTab === 'photos' && (
            <>
              {/* Check-in Banner */}
              <CheckInBanner
                show={showBanner || (tourOpen && tourStep === 1)}
                suggestedTag={bannerState.suggested_tag || 'Goa Trip'}
                photoCount={bannerState.photo_count || 12}
                onDismiss={dismissBanner}
                onConfirm={() => setActiveTab('lifestages')}
              />

              <LibraryView
                photos={filteredPhotos}
                selectedPhotoIds={selectedPhotoIds}
                setSelectedPhotoIds={setSelectedPhotoIds}
                onOpenTagEditor={handleOpenTagEditor}
                onConfirmSelectedSuggestions={handleConfirmSelectedSuggestions}
                onOpenPhotoViewer={handleOpenPhotoViewer}
                onSimulatedUpload={simulatedUpload}
              />
            </>
          )}

          {/* Tab 3: Life Stages Grouped View */}
          {activeTab === 'lifestages' && (
            <LifeStagesView
              photos={photos}
              onManageTag={(tagLabel) => handleOpenTagEditor('rename', tagLabel)}
              onOpenTagEditor={handleOpenTagEditor}
              onOpenPhotoViewer={handleOpenPhotoViewer}
              onConfirmSuggestion={async (pid, label) => {
                await confirmSuggestion(pid, label);
                await refreshPhotos();
              }}
              onRemoveTag={async (pid, label) => {
                await removePhotoTag(pid, label);
                await refreshPhotos();
              }}
            />
          )}
        </div>
      </main>

      {/* Full-Screen Photo Viewer Modal */}
      <FullScreenPhotoViewer
        photos={effectiveViewerPhotos}
        currentIndex={activePhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onSelectIndex={setActivePhotoIndex}
        onOpenTagEditor={(action, label) => {
          if (effectiveViewerPhotos[activePhotoIndex]) {
            setSelectedPhotoIds([effectiveViewerPhotos[activePhotoIndex].id]);
          }
          handleOpenTagEditor(action, label);
        }}
        onConfirmSuggestion={async (pid, label) => {
          await confirmSuggestion(pid, label);
          await refreshPhotos();
        }}
        onRemoveTag={async (pid, label) => {
          await removePhotoTag(pid, label);
          await refreshPhotos();
        }}
        onAssignTag={async (ids, label) => {
          await assignTag(ids, label);
          await refreshPhotos();
        }}
      />

      {/* Tag Editor Modal Drawer */}
      <TagEditorDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        actionType={drawerAction}
        selectedPhotoIds={selectedPhotoIds}
        activeTagLabel={activeTagLabel}
        existingTags={Array.from(new Set(photos.flatMap((p) => p.tags.map((t) => t.label))))}
        onAssignTag={async (ids, label) => {
          await assignTag(ids, label);
          setSelectedPhotoIds([]);
        }}
        onRenameTag={renameTag}
        onMergeTags={mergeTags}
        onDeleteTagGroup={deleteTagGroup}
        onBulkTagRange={bulkTagRange}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* First-Time Guided Product Tour Overlay Sequence */}
      <ProductTour
        isOpen={tourOpen}
        currentStep={tourStep}
        onNext={handleNextTourStep}
        onPrev={handlePrevTourStep}
        onSkip={handleSkipTour}
        onComplete={handleCompleteTour}
      />
      </div>
    </div>
  );
}
