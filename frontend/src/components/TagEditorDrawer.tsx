import React, { useState } from 'react';

interface TagEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: string;
  selectedPhotoIds: string[];
  activeTagLabel?: string;
  existingTags?: string[];
  onAssignTag: (photoIds: string[], tagLabel: string) => Promise<void>;
  onRenameTag: (oldLabel: string, newLabel: string) => Promise<void>;
  onMergeTags: (sourceLabel: string, targetLabel: string) => Promise<void>;
  onDeleteTagGroup: (tagLabel: string) => Promise<void>;
  onBulkTagRange: (startDate: string, endDate: string, tagLabel: string) => Promise<void>;
}

export const TagEditorDrawer: React.FC<TagEditorDrawerProps> = ({
  isOpen,
  onClose,
  actionType,
  selectedPhotoIds,
  activeTagLabel = '',
  existingTags = ['Started New Job', 'Moved to New City', 'Goa Trip', 'Diwali 2023'],
  onAssignTag,
  onRenameTag,
  onMergeTags,
  onDeleteTagGroup,
  onBulkTagRange,
}) => {
  const [tagInput, setTagInput] = useState<string>(activeTagLabel);
  const [targetMergeTag, setTargetMergeTag] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('2022-01-01');
  const [endDate, setEndDate] = useState<string>('2024-12-31');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      if (actionType === 'rename') {
        setTagInput(activeTagLabel);
      } else if (actionType === 'assign') {
        setTagInput('');
      } else if (actionType === 'merge') {
        setTargetMergeTag('');
      }
    }
  }, [isOpen, actionType, activeTagLabel]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (actionType === 'assign') {
        if (!tagInput.trim()) return;
        await onAssignTag(selectedPhotoIds, tagInput.trim());
      } else if (actionType === 'rename') {
        if (!tagInput.trim()) return;
        await onRenameTag(activeTagLabel, tagInput.trim());
      } else if (actionType === 'merge') {
        if (!targetMergeTag.trim()) return;
        await onMergeTags(activeTagLabel, targetMergeTag.trim());
      } else if (actionType === 'delete') {
        await onDeleteTagGroup(activeTagLabel);
      } else if (actionType === 'bulk') {
        if (!tagInput.trim() || !startDate || !endDate) return;
        await onBulkTagRange(startDate, endDate, tagInput.trim());
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Tag action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
          <h2 className="font-semibold text-lg text-on-surface">
            {actionType === 'assign' && `Tag Selected Photos (${selectedPhotoIds.length})`}
            {actionType === 'rename' && `Rename Tag "${activeTagLabel}"`}
            {actionType === 'merge' && `Merge Tag "${activeTagLabel}"`}
            {actionType === 'delete' && `Delete Tag Group "${activeTagLabel}"`}
            {actionType === 'bulk' && `Bulk Tag Timeline Date Range`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {actionType === 'delete' ? (
            <div className="p-3 bg-error-container/30 text-on-error-container rounded-xl text-sm leading-relaxed border border-error/20">
              Are you sure you want to delete the tag group <strong className="font-semibold">&quot;{activeTagLabel}&quot;</strong>?
              <br />
              <span className="text-xs text-on-surface-variant mt-1 block">
                This removes metadata tags from all photos. Your original photo files in <strong>Photos_Data/</strong> are never deleted.
              </span>
            </div>
          ) : actionType === 'merge' ? (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-on-surface-variant">Merge &quot;{activeTagLabel}&quot; into target tag:</label>
              <input
                type="text"
                value={targetMergeTag}
                onChange={(e) => setTargetMergeTag(e.target.value)}
                placeholder="Enter target tag name (e.g. Career Milestone)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />

              {/* Selectable Existing Tags Chips for Merging */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Select from existing tags to merge into:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(existingTags && existingTags.length > 0
                    ? existingTags
                    : ['Started New Job', 'Moved to New City', 'Goa Trip', 'Diwali 2023']
                  )
                    .filter((tag) => tag !== activeTagLabel)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTargetMergeTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          targetMergeTag === tag
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-surface-container-low text-on-surface border-surface-container-high hover:bg-surface-container-high'
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : actionType === 'bulk' ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant">Tag Name:</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Goa Trip, Diwali 2023"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-sm text-on-surface mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant">End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-sm text-on-surface mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface-variant">Tag Label:</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Goa Trip, Started New Job, Moved to New City, Diwali 2023"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />

              {/* Selectable Existing Tags Chips */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Select from existing tags:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(existingTags && existingTags.length > 0
                    ? existingTags
                    : ['Started New Job', 'Moved to New City', 'Goa Trip', 'Diwali 2023']
                  ).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagInput(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        tagInput === tag
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface border-surface-container-high hover:bg-surface-container-high'
                      }`}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-outline font-medium text-xs hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-full font-medium text-xs shadow-sm flex items-center gap-1.5 transition-all ${
                actionType === 'delete'
                  ? 'bg-error text-white hover:bg-red-700'
                  : 'bg-primary text-on-primary hover:bg-primary-container'
              } disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {actionType === 'delete' ? 'delete' : 'check'}
              </span>
              <span>{isSubmitting ? 'Saving...' : 'Confirm'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
