from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class Tag(BaseModel):
    label: str
    status: Literal["suggested", "confirmed"] = "suggested"

class Photo(BaseModel):
    id: str
    filename: str
    timestamp: str
    tags: List[Tag] = Field(default_factory=list)

class CalendarEvent(BaseModel):
    title: str
    date: str
    inferred_tag: str

class GmailSignal(BaseModel):
    subject: str
    date_range: List[str]
    inferred_tag: str

class MapsSignal(BaseModel):
    pattern: str
    detected_week: str
    inferred_tag: str

class SignalsData(BaseModel):
    calendar_events: List[CalendarEvent] = Field(default_factory=list)
    gmail_signals: List[GmailSignal] = Field(default_factory=list)
    maps_signals: List[MapsSignal] = Field(default_factory=list)

# Tag Operation Request Schemas
class AssignTagRequest(BaseModel):
    photo_ids: List[str]
    tag_label: str

class ConfirmSuggestionRequest(BaseModel):
    photo_id: str
    tag_label: str

class RenameTagRequest(BaseModel):
    old_label: str
    new_label: str

class RemovePhotoTagRequest(BaseModel):
    photo_id: str
    tag_label: str

class MergeTagsRequest(BaseModel):
    source_label: str
    target_label: str

class DeleteTagGroupRequest(BaseModel):
    tag_label: str

class BulkTagRangeRequest(BaseModel):
    start_date: str
    end_date: str
    tag_label: str

class CheckInResponse(BaseModel):
    has_new_suggestion: bool
    suggested_tag: Optional[str] = None
    photo_count: int = 0
    photo_ids: List[str] = Field(default_factory=list)

# Layer 2 Chat & Retrieval Schemas
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)

class ChatResponse(BaseModel):
    response: str
    candidates: List[Photo] = Field(default_factory=list)
    needs_followup: bool = False
    meta: dict = Field(default_factory=dict)

class ConfirmMatchRequest(BaseModel):
    photo_id: str


