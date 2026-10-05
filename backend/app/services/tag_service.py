import logging
from typing import List, Optional, Tuple
from datetime import datetime
from app.models.schemas import Photo, Tag, CheckInResponse
from app.services.data_manager import data_manager
from app.services.signal_engine import apply_signal_matching

logger = logging.getLogger(__name__)

# Pre-defined pool for simulated upload feature (Section 4.6)
SIMULATED_UPLOAD_POOL = [
    { "id": "upload_01", "filename": "goa_01.jpg.png", "timestamp": "2024-06-16" },
    { "id": "upload_02", "filename": "newjob_01.jpg.jpg", "timestamp": "2023-03-05" },
    { "id": "upload_03", "filename": "newcity_01.jpg.png", "timestamp": "2023-08-10" },
    { "id": "upload_04", "filename": "goa_02.jpg.png", "timestamp": "2024-06-17" },
    { "id": "upload_05", "filename": "newjob_02.jpg.png", "timestamp": "2023-03-12" },
]

class TagService:
    def assign_tag(self, photo_ids: List[str], tag_label: str) -> List[Photo]:
        """Assign tag with status 'confirmed' to selected photo(s)."""
        photos = data_manager.load_photos()
        photo_id_set = set(photo_ids)
        updated_photos = []

        for p in photos:
            if p.id in photo_id_set:
                # Remove any existing tag with same label (whether suggested or confirmed)
                p.tags = [t for t in p.tags if t.label != tag_label]
                # Add confirmed tag
                p.tags.append(Tag(label=tag_label, status="confirmed"))
                updated_photos.append(p)

        data_manager.save_photos(photos)
        return updated_photos

    def confirm_suggestion(self, photo_id: str, tag_label: str) -> Optional[Photo]:
        """Upgrade tag status from 'suggested' to 'confirmed' for a specific photo."""
        photos = data_manager.load_photos()
        target_photo = None

        for p in photos:
            if p.id == photo_id:
                for t in p.tags:
                    if t.label == tag_label:
                        t.status = "confirmed"
                        target_photo = p
                break

        if target_photo:
            data_manager.save_photos(photos)
        return target_photo

    def rename_tag(self, old_label: str, new_label: str) -> List[Photo]:
        """
        Rename a tag group across all photos.
        If new_label already exists on a photo, merges them cleanly without duplicate tags.
        """
        photos = data_manager.load_photos()
        updated_photos = []

        for p in photos:
            has_old = any(t.label == old_label for t in p.tags)
            if has_old:
                # Find old tag status (prefer confirmed if either is confirmed)
                statuses = [t.status for t in p.tags if t.label in (old_label, new_label)]
                final_status = "confirmed" if "confirmed" in statuses else "suggested"

                # Filter out both old and new labels
                p.tags = [t for t in p.tags if t.label not in (old_label, new_label)]
                # Add merged tag with final status
                p.tags.append(Tag(label=new_label, status=final_status))
                updated_photos.append(p)

        data_manager.save_photos(photos)
        return updated_photos

    def remove_photo_from_tag(self, photo_id: str, tag_label: str) -> Optional[Photo]:
        """Remove a specific tag from a photo."""
        photos = data_manager.load_photos()
        target_photo = None

        for p in photos:
            if p.id == photo_id:
                p.tags = [t for t in p.tags if t.label != tag_label]
                target_photo = p
                break

        if target_photo:
            data_manager.save_photos(photos)
        return target_photo

    def merge_tags(self, source_label: str, target_label: str) -> List[Photo]:
        """Merge source_label into target_label across all photos."""
        return self.rename_tag(old_label=source_label, new_label=target_label)

    def delete_tag_group(self, tag_label: str) -> int:
        """
        Delete a tag group entirely from metadata.
        Never deletes underlying photo image files. Returns count of affected photos.
        """
        photos = data_manager.load_photos()
        affected_count = 0

        for p in photos:
            initial_len = len(p.tags)
            p.tags = [t for t in p.tags if t.label != tag_label]
            if len(p.tags) < initial_len:
                affected_count += 1

        data_manager.save_photos(photos)
        return affected_count

    def bulk_tag_range(self, start_date: str, end_date: str, tag_label: str) -> List[Photo]:
        """Assign confirmed tag to all photos falling within date range [start_date, end_date]."""
        photos = data_manager.load_photos()
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        updated_photos = []

        for p in photos:
            try:
                p_dt = datetime.strptime(p.timestamp, "%Y-%m-%d")
                if start_dt <= p_dt <= end_dt:
                    p.tags = [t for t in p.tags if t.label != tag_label]
                    p.tags.append(Tag(label=tag_label, status="confirmed"))
                    updated_photos.append(p)
            except Exception as e:
                logger.error(f"Error parsing timestamp for photo {p.id}: {e}")

        data_manager.save_photos(photos)
        return updated_photos

    def get_check_in_banner(self) -> CheckInResponse:
        """
        Check-in feature (Section 4.5):
        Checks if any 'suggested' tag exists in photos.json.
        Returns the first unconfirmed suggested tag details.
        """
        photos = data_manager.load_photos()
        suggested_map = {}

        for p in photos:
            for t in p.tags:
                if t.status == "suggested":
                    if t.label not in suggested_map:
                        suggested_map[t.label] = []
                    suggested_map[t.label].append(p.id)

        if not suggested_map:
            return CheckInResponse(has_new_suggestion=False)

        # Pick the first suggested tag
        first_tag, photo_ids = next(iter(suggested_map.items()))
        return CheckInResponse(
            has_new_suggestion=True,
            suggested_tag=first_tag,
            photo_count=len(photo_ids),
            photo_ids=photo_ids
        )

    def simulated_upload(self) -> Tuple[Optional[Photo], str]:
        """
        Simulated Photo Upload (Section 4.6):
        Pulls next image from upload pool, runs it through single unified apply_signal_matching,
        saves to photos.json, and returns (new_photo, message).
        """
        photos = data_manager.load_photos()
        existing_ids = {p.id for p in photos}

        # Find next available photo in pool
        next_item = next((item for item in SIMULATED_UPLOAD_POOL if item["id"] not in existing_ids), None)

        if not next_item:
            logger.info("Simulated upload pool exhausted.")
            return None, "Upload pool exhausted. All demo upload photos have been added."

        # Create new Photo object
        new_photo = Photo(
            id=next_item["id"],
            filename=next_item["filename"],
            timestamp=next_item["timestamp"],
            tags=[]
        )

        # Pass through the EXACT SAME apply_signal_matching function
        signals = data_manager.load_signals()
        new_photo = apply_signal_matching(new_photo, signals)

        # Save to photos.json
        photos.append(new_photo)
        data_manager.save_photos(photos)
        logger.info(f"Simulated upload complete for photo '{new_photo.id}' with tags {new_photo.tags}.")

        return new_photo, "Photo uploaded successfully."

tag_service = TagService()
