import { useState, useEffect, useCallback } from 'react';
import { Photo } from '../lib/types';
import * as api from '../lib/api';

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchPhotos();
      setPhotos(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPhotosToDefault = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.resetPhotos();
      setPhotos(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset photos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reset to default seed state on initial page load for fresh testing
    resetPhotosToDefault();
  }, [resetPhotosToDefault]);

  const handleAssignTag = async (photoIds: string[], tagLabel: string) => {
    try {
      await api.assignTag(photoIds, tagLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error assigning tag');
    }
  };

  const handleConfirmSuggestion = async (photoId: string, tagLabel: string) => {
    try {
      await api.confirmSuggestion(photoId, tagLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error confirming suggestion');
    }
  };

  const handleRenameTag = async (oldLabel: string, newLabel: string) => {
    try {
      await api.renameTag(oldLabel, newLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error renaming tag');
    }
  };

  const handleRemovePhotoTag = async (photoId: string, tagLabel: string) => {
    try {
      await api.removePhotoFromTag(photoId, tagLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error removing tag');
    }
  };

  const handleMergeTags = async (sourceLabel: string, targetLabel: string) => {
    try {
      await api.mergeTags(sourceLabel, targetLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error merging tags');
    }
  };

  const handleDeleteTagGroup = async (tagLabel: string) => {
    try {
      await api.deleteTagGroup(tagLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error deleting tag group');
    }
  };

  const handleBulkTagRange = async (startDate: string, endDate: string, tagLabel: string) => {
    try {
      await api.bulkTagRange(startDate, endDate, tagLabel);
      await loadPhotos();
    } catch (err: any) {
      alert(err.message || 'Error bulk tagging date range');
    }
  };

  const handleSimulatedUpload = async () => {
    try {
      const res = await api.simulatedUpload();
      if (res.photo) {
        await loadPhotos();
        return res;
      } else {
        alert(res.message);
        return res;
      }
    } catch (err: any) {
      alert(err.message || 'Error simulating upload');
      return null;
    }
  };

  return {
    photos,
    loading,
    error,
    refreshPhotos: loadPhotos,
    resetPhotos: resetPhotosToDefault,
    assignTag: handleAssignTag,
    confirmSuggestion: handleConfirmSuggestion,
    renameTag: handleRenameTag,
    removePhotoTag: handleRemovePhotoTag,
    mergeTags: handleMergeTags,
    deleteTagGroup: handleDeleteTagGroup,
    bulkTagRange: handleBulkTagRange,
    simulatedUpload: handleSimulatedUpload,
  };
}
