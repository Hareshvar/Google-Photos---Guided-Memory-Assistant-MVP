export type TagStatus = 'suggested' | 'confirmed';

export interface Tag {
  label: string;
  status: TagStatus;
}


export interface Photo {
  id: string;
  filename: string;
  timestamp: string;
  tags: Tag[];
}

export interface CheckInBannerState {
  has_new_suggestion: boolean;
  suggested_tag?: string;
  photo_count: number;
  photo_ids: string[];
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  candidates: Photo[];
  needs_followup: boolean;
  meta: {
    provider_used?: string;
    attempts?: number;
    latency_ms?: number;
  };
}
