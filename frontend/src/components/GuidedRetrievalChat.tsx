import React, { useState, useRef, useEffect } from 'react';
import { Photo, ChatMessage } from '../lib/types';
import { sendChatMessage, confirmMatch, getPhotoImageUrl } from '../lib/api';

interface GuidedRetrievalChatProps {
  onClose?: () => void;
  onOpenPhotoViewer?: (index: number, customPhotos?: Photo[]) => void;
}

interface ExtendedChatMessage extends ChatMessage {
  candidates?: Photo[];
  confirmedPhotoIds?: string[];
  isLocked?: boolean;
}

export const GuidedRetrievalChat: React.FC<GuidedRetrievalChatProps> = ({ onClose, onOpenPhotoViewer }) => {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help you find a photo you remember but can\'t quite search for — no exact date or perfect keyword needed. Try something like "a beach trip from a while back" or "around when I started my new job." What are you looking for?',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Ensure clean landing at top of conversation on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (messages.length > 1 || loading) {
      scrollToBottom();
    }
  }, [messages.length, loading]);

  const toggleSelectCandidate = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleConfirmSelected = async (targetMsgIdx: number) => {
    if (selectedPhotoIds.length === 0) return;

    const confirmedIds = [...selectedPhotoIds];
    setSelectedPhotoIds([]);

    // Instantly lock ONLY the specific target candidate card (No LLM call!)
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[targetMsgIdx]) {
        updated[targetMsgIdx] = {
          ...updated[targetMsgIdx],
          isLocked: true,
          confirmedPhotoIds: confirmedIds,
        };
      }
      return [
        ...updated,
        { role: 'user', content: `[Confirmed ${confirmedIds.length} photo(s)]` },
        { role: 'assistant', content: 'found it, glad that worked!' },
      ];
    });

    // Send confirmation event for retrieval tracking
    try {
      for (const pid of confirmedIds) {
        await confirmMatch(pid);
      }
    } catch (err) {
      console.error('Error sending confirm match:', err);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const rawInput = input.trim();
    const currentSelections = [...selectedPhotoIds];
    const hasSelection = currentSelections.length > 0;

    setInput('');
    if (hasSelection) {
      setSelectedPhotoIds([]);
    }

    const apiPrompt = hasSelection
      ? `[Referencing selected photo IDs: ${currentSelections.join(', ')}] ${rawInput}`
      : rawInput;

    const displayPrompt = hasSelection
      ? `[${currentSelections.length} photo(s) selected] ${rawInput}`
      : rawInput;

    // Append user message
    const newHistory: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: apiPrompt },
    ];

    setMessages((prev) => [...prev, { role: 'user', content: displayPrompt }]);
    setLoading(true);

    try {
      const chatRes = await sendChatMessage(apiPrompt, newHistory);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: chatRes.response,
          candidates: chatRes.candidates || [],
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I ran into an issue connecting to the memory search service. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-3xl md:max-w-4xl mx-auto bg-surface relative select-none pb-safe">
      {/* Chat Top Header */}
      <div className="px-4 py-3 bg-surface-container-lowest border-b border-surface-container-high flex items-center justify-between shrink-0 shadow-sm rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <div>
            <h1 className="font-semibold text-base text-on-surface leading-tight">Guided Memory Assistant</h1>
            <span className="text-[11px] text-on-surface-variant font-medium">Conversational Photo Retrieval</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area - Scroll strictly constrained internally */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLocked = msg.isLocked || false;
          const confirmedPhotoIds = msg.confirmedPhotoIds || [];

          return (
            <div
              key={idx}
              className={`flex flex-col max-w-[88%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
            >
              {/* Text Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-primary text-on-primary rounded-br-none shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface rounded-bl-none shadow-sm border border-surface-container-high'
                }`}
              >
                {msg.content}
              </div>

              {/* Candidate Photo Grid Inside Chat */}
              {!isUser && msg.candidates && msg.candidates.length > 0 && (
                <div className="mt-3 w-full bg-surface-container-lowest p-3 rounded-2xl shadow-sm border border-surface-container-high flex flex-col gap-2">
                  {!isLocked && (
                    <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">touch_app</span>
                      Tap ✓ on any photo that might be the one, then hit Confirm below.
                    </span>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {msg.candidates.map((photo, candIdx) => {
                      const isSelected = selectedPhotoIds.includes(photo.id);
                      const isConfirmed = confirmedPhotoIds.includes(photo.id);

                      const handleTileClick = () => {
                        if (onOpenPhotoViewer && msg.candidates) {
                          onOpenPhotoViewer(candIdx, msg.candidates);
                        }
                      };

                      const handleToggleClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!isLocked) {
                          toggleSelectCandidate(photo.id);
                        }
                      };

                      return (
                        <div
                          key={photo.id}
                          onClick={handleTileClick}
                          className={`relative aspect-square rounded-xl overflow-hidden bg-surface-container cursor-pointer group border-2 transition-all ${
                            isConfirmed
                              ? 'border-[#1e8e3e] ring-2 ring-[#1e8e3e]'
                              : isSelected && !isLocked
                              ? 'border-[#0058bd] ring-4 ring-[#0058bd] ring-inset scale-95'
                              : 'border-transparent hover:border-primary'
                          }`}
                        >
                          <img
                            src={getPhotoImageUrl(photo.id)}
                            alt={photo.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Checkbox (if active) or Static Confirmed Badge (if locked) */}
                          {!isLocked ? (
                            <button
                              onClick={handleToggleClick}
                              aria-label="Select photo"
                              className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all z-20 ${
                                isSelected
                                  ? 'bg-[#0058bd] text-white opacity-100 shadow-md ring-2 ring-white scale-100'
                                  : 'bg-black/50 backdrop-blur-xs text-white opacity-80 hover:opacity-100 hover:scale-110 active:scale-95'
                              }`}
                              title={isSelected ? 'Deselect photo' : 'Select photo'}
                            >
                              <span className="material-symbols-outlined text-[15px] font-bold leading-none select-none">
                                check
                              </span>
                            </button>
                          ) : isConfirmed ? (
                            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#1e8e3e] text-white text-[10px] font-bold flex items-center gap-1 shadow-sm z-20">
                              <span className="material-symbols-outlined text-[12px] font-bold leading-none">check</span>
                              <span>Confirmed</span>
                            </div>
                          ) : null}

                          {/* Tag Badges - Always preserved on thumbnail */}
                          {photo.tags.length > 0 && (
                            <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md text-[10px] truncate z-10">
                              {photo.tags[0].label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Single Confirm Button - ONLY below photo grid, ONLY when active & selected */}
                  {!isLocked && selectedPhotoIds.length > 0 && (
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleConfirmSelected(idx)}
                        className="px-4 py-2 bg-[#0058bd] text-white text-xs font-semibold rounded-full shadow-md hover:bg-[#004494] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer z-10"
                      >
                        <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        <span>Confirm ({selectedPhotoIds.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="self-start flex items-center gap-2 bg-surface-container-lowest px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-surface-container-high text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
            <span>Searching memory library...</span>
          </div>
        )}
      </div>

      {/* Contextual Selected Photos Indicator Pill (No duplicate Confirm button) */}
      {selectedPhotoIds.length > 0 && (
        <div className="px-4 py-2 bg-[#E8F0FE] border-t border-[#adc6ff] flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-sm text-[#0058bd]" style={{ fontVariationSettings: "'FILL' 1" }}>
              collections
            </span>
            <span className="text-xs font-semibold text-[#0058bd] truncate font-sans">
              {selectedPhotoIds.length} photo{selectedPhotoIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPhotoIds([])}
            className="text-xs font-medium text-[#5F6368] hover:text-[#202124] flex items-center gap-0.5 hover:underline font-sans px-2 py-1"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Input Bar - Positioned cleanly above BottomNav */}
      <form
        onSubmit={handleSend}
        className="p-3 mb-16 bg-surface-container-lowest border-t border-surface-container-high shrink-0 flex items-center gap-2 z-30 shadow-md"
      >
        <div className="flex-1 bg-surface-container-low rounded-full px-4 py-2 flex items-center gap-2 border border-surface-container-high focus-within:ring-2 focus-within:ring-primary/40">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedPhotoIds.length > 0
                ? `${selectedPhotoIds.length} photo${selectedPhotoIds.length > 1 ? 's' : ''} selected -- tap Confirm above`
                : 'Describe your memory (e.g. Goa trip)...'
            }
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none font-sans"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </div>
  );
};
