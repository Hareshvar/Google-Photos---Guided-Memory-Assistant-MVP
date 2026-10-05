import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.config import settings
from app.models import Photo, SignalsData, schemas
from app.services import data_manager, run_startup_signal_matching, tag_service, agent_service


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("guided-memory-assistant")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run one-time signal-matching engine check across all seed photos
    logger.info("Initializing Guided Memory Assistant Backend...")
    run_startup_signal_matching()
    yield
    logger.info("Shutting down Guided Memory Assistant Backend...")

app = FastAPI(
    title="Guided Memory Assistant API",
    version="1.0.0",
    description="Backend API for Google Photos Guided Memory Assistant MVP",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Guided Memory Assistant API"}

@app.get("/api/photos")
async def get_photos():
    """Return all photos with their tags."""
    photos = data_manager.load_photos()
    return photos

@app.post("/api/photos/reset")
async def reset_photos():
    """Reset photos library and tags to default seed state for demo testing."""
    photos = data_manager.reset_to_default()
    return {"status": "success", "message": "Reset photos to default state", "photos": photos}

@app.get("/api/photos/{photo_id}/image")
async def get_photo_image(photo_id: str):
    """Serve photo image file from Photos_Data directory."""
    photos = data_manager.load_photos()
    photo = next((p for p in photos if p.id == photo_id), None)
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with id '{photo_id}' not found.")

    image_path = settings.PHOTOS_DATA_DIR / photo.filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file '{photo.filename}' not found on server.")

    # Determine media type
    ext = image_path.suffix.lower()
    media_type = "image/jpeg"
    if ext == ".png":
        media_type = "image/png"
    elif ext in [".jpg", ".jpeg"]:
        media_type = "image/jpeg"

    return FileResponse(image_path, media_type=media_type)

@app.get("/api/signals")
async def get_signals():
    """Return pre-seeded signals."""
    signals = data_manager.load_signals()
    return signals

# --- Phase 2: Layer 1 Tagging & Tag Management Endpoints ---

@app.post("/api/tags/assign")
async def assign_tag(req: schemas.AssignTagRequest):
    """Assign confirmed tag to selected photos."""
    updated = tag_service.assign_tag(req.photo_ids, req.tag_label)
    return {"status": "success", "updated_count": len(updated), "photos": updated}

@app.post("/api/tags/confirm")
async def confirm_suggestion(req: schemas.ConfirmSuggestionRequest):
    """Upgrade a tag status from 'suggested' to 'confirmed'."""
    photo = tag_service.confirm_suggestion(req.photo_id, req.tag_label)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo or tag not found.")
    return {"status": "success", "photo": photo}

@app.post("/api/tags/rename")
async def rename_tag(req: schemas.RenameTagRequest):
    """Rename a tag label across all photos."""
    updated = tag_service.rename_tag(req.old_label, req.new_label)
    return {"status": "success", "updated_count": len(updated), "photos": updated}

@app.post("/api/tags/remove-photo")
async def remove_photo_from_tag(req: schemas.RemovePhotoTagRequest):
    """Remove tag from a single photo."""
    photo = tag_service.remove_photo_from_tag(req.photo_id, req.tag_label)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found.")
    return {"status": "success", "photo": photo}

@app.post("/api/tags/merge")
async def merge_tags(req: schemas.MergeTagsRequest):
    """Merge source tag into target tag across all photos."""
    updated = tag_service.merge_tags(req.source_label, req.target_label)
    return {"status": "success", "updated_count": len(updated), "photos": updated}

@app.post("/api/tags/delete")
async def delete_tag_group(req: schemas.DeleteTagGroupRequest):
    """Delete a tag group entirely from metadata without deleting photo files."""
    affected_count = tag_service.delete_tag_group(req.tag_label)
    return {"status": "success", "affected_count": affected_count, "deleted_tag": req.tag_label}

@app.post("/api/tags/bulk-range")
async def bulk_tag_range(req: schemas.BulkTagRangeRequest):
    """Assign confirmed tag to all photos in date range."""
    updated = tag_service.bulk_tag_range(req.start_date, req.end_date, req.tag_label)
    return {"status": "success", "updated_count": len(updated), "photos": updated}

@app.get("/api/check-in")
async def get_check_in_banner():
    """Get check-in banner state for unconfirmed suggested tags."""
    return tag_service.get_check_in_banner()

@app.post("/api/photos/upload")
async def simulated_upload():
    """Simulated photo upload pulling next image from pool and running signal matching."""
    new_photo, message = tag_service.simulated_upload()
    if not new_photo:
        return {"status": "exhausted", "message": message, "photo": None}
    return {"status": "success", "message": message, "photo": new_photo}

# --- Phase 3: Layer 2 Guided Retrieval Chat Endpoints ---

@app.post("/api/chat")
async def chat_endpoint(req: schemas.ChatRequest):
    """
    Guided Retrieval Chat endpoint:
    Processes user memory query, performs extraction, live event resolution,
    metadata filtering, multimodal candidate ranking, and returns response payload.
    """
    try:
        response_data = agent_service.process_chat(req.message, req.history)
        return response_data
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Search service error: {str(e)}")

@app.post("/api/confirm")
async def confirm_match_endpoint(req: schemas.ConfirmMatchRequest):
    """
    Confirms user selected photo match to close the retrieval task.
    """
    photos = data_manager.load_photos()
    photo = next((p for p in photos if p.id == req.photo_id), None)
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo with id '{req.photo_id}' not found.")
    return {
        "status": "success",
        "message": f"Confirmed photo match '{photo.id}'! Task complete.",
        "confirmed_photo": photo
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)


