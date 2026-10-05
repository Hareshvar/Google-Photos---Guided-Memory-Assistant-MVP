import { Photo, CheckInBannerState, ChatMessage, ChatResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const getPhotoImageUrl = (photoId: string): string => {
  return `${API_BASE}/api/photos/${photoId}/image`;
};

export async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/photos`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch photos');
  return res.json();
}

export async function resetPhotos(): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/photos/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to reset photos');
  const data = await res.json();
  return data.photos;
}

export async function fetchCheckInBanner(): Promise<CheckInBannerState> {
  const res = await fetch(`${API_BASE}/api/check-in`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch check-in state');
  return res.json();
}

export async function assignTag(photoIds: string[], tagLabel: string): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/tags/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_ids: photoIds, tag_label: tagLabel }),
  });
  if (!res.ok) throw new Error('Failed to assign tag');
  const data = await res.json();
  return data.photos;
}

export async function confirmSuggestion(photoId: string, tagLabel: string): Promise<Photo> {
  const res = await fetch(`${API_BASE}/api/tags/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: photoId, tag_label: tagLabel }),
  });
  if (!res.ok) throw new Error('Failed to confirm suggestion');
  const data = await res.json();
  return data.photo;
}

export async function renameTag(oldLabel: string, newLabel: string): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/tags/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_label: oldLabel, new_label: newLabel }),
  });
  if (!res.ok) throw new Error('Failed to rename tag');
  const data = await res.json();
  return data.photos;
}

export async function removePhotoFromTag(photoId: string, tagLabel: string): Promise<Photo> {
  const res = await fetch(`${API_BASE}/api/tags/remove-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: photoId, tag_label: tagLabel }),
  });
  if (!res.ok) throw new Error('Failed to remove photo from tag');
  const data = await res.json();
  return data.photo;
}

export async function mergeTags(sourceLabel: string, targetLabel: string): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/tags/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_label: sourceLabel, target_label: targetLabel }),
  });
  if (!res.ok) throw new Error('Failed to merge tags');
  const data = await res.json();
  return data.photos;
}

export async function deleteTagGroup(tagLabel: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/tags/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_label: tagLabel }),
  });
  if (!res.ok) throw new Error('Failed to delete tag group');
  const data = await res.json();
  return data.affected_count;
}

export async function bulkTagRange(startDate: string, endDate: string, tagLabel: string): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/tags/bulk-range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate, end_date: endDate, tag_label: tagLabel }),
  });
  if (!res.ok) throw new Error('Failed to bulk tag date range');
  const data = await res.json();
  return data.photos;
}

export async function simulatedUpload(): Promise<{ photo: Photo | null; message: string }> {
  const res = await fetch(`${API_BASE}/api/photos/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to simulate upload');
  return res.json();
}

export async function sendChatMessage(message: string, history: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error('Failed to send chat message');
  return res.json();
}

export async function confirmMatch(photoId: string): Promise<{ status: string; message: string; confirmed_photo: Photo }> {
  const res = await fetch(`${API_BASE}/api/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: photoId }),
  });
  if (!res.ok) throw new Error('Failed to confirm match');
  return res.json();
}
