import { useState, useEffect, useCallback } from 'react';
import { CheckInBannerState } from '../lib/types';
import * as api from '../lib/api';

export function useCheckIn() {
  const [bannerState, setBannerState] = useState<CheckInBannerState>({
    has_new_suggestion: false,
    photo_count: 0,
    photo_ids: [],
  });
  const [dismissed, setDismissed] = useState<boolean>(false);

  const checkBanner = useCallback(async () => {
    try {
      const data = await api.fetchCheckInBanner();
      setBannerState(data);
    } catch (err) {
      console.error('Error fetching check-in banner state:', err);
    }
  }, []);

  useEffect(() => {
    checkBanner();
  }, [checkBanner]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleConfirmBannerTag = async (onSuccessRefresh: () => void) => {
    if (!bannerState.suggested_tag || bannerState.photo_ids.length === 0) return;
    try {
      // Upgrade status to confirmed for all photos in banner
      for (const pid of bannerState.photo_ids) {
        await api.confirmSuggestion(pid, bannerState.suggested_tag);
      }
      setDismissed(true);
      onSuccessRefresh();
      await checkBanner();
    } catch (err: any) {
      alert(err.message || 'Error confirming banner tags');
    }
  };

  return {
    showBanner: bannerState.has_new_suggestion && !dismissed,
    bannerState,
    dismissBanner: handleDismiss,
    confirmBannerTag: handleConfirmBannerTag,
    refreshCheckIn: checkBanner,
  };
}
