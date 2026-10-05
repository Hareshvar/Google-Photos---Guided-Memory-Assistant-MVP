import logging
from datetime import datetime, timedelta
from typing import List
from app.models.schemas import Photo, Tag, SignalsData
from app.services.data_manager import data_manager

logger = logging.getLogger(__name__)

def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")

def apply_signal_matching(photo: Photo, signals: SignalsData) -> Photo:
    """
    Unified signal-matching engine.
    Checks a single photo's timestamp against calendar events, gmail signals, and maps signals.
    Appends any inferred tag with status 'suggested' if not already present.
    """
    try:
        photo_dt = parse_date(photo.timestamp)
    except Exception as e:
        logger.error(f"Failed to parse timestamp '{photo.timestamp}' for photo '{photo.id}': {e}")
        return photo

    existing_labels = {t.label for t in photo.tags}

    # 1. Check Calendar Events
    for event in signals.calendar_events:
        try:
            event_dt = parse_date(event.date)
            # Match if in same month/year or within 14 days after event
            same_month = (photo_dt.year == event_dt.year and photo_dt.month == event_dt.month)
            days_diff = (photo_dt - event_dt).days
            within_14_days = 0 <= days_diff <= 14

            if same_month or within_14_days:
                if event.inferred_tag not in existing_labels:
                    photo.tags.append(Tag(label=event.inferred_tag, status="suggested"))
                    existing_labels.add(event.inferred_tag)
        except Exception as e:
            logger.error(f"Error checking calendar signal: {e}")

    # 2. Check Gmail Signals
    for gmail in signals.gmail_signals:
        try:
            if len(gmail.date_range) == 2:
                start_dt = parse_date(gmail.date_range[0])
                end_dt = parse_date(gmail.date_range[1])
                if start_dt <= photo_dt <= end_dt:
                    if gmail.inferred_tag not in existing_labels:
                        photo.tags.append(Tag(label=gmail.inferred_tag, status="suggested"))
                        existing_labels.add(gmail.inferred_tag)
        except Exception as e:
            logger.error(f"Error checking gmail signal: {e}")

    # 3. Check Maps Signals
    for maps in signals.maps_signals:
        try:
            week_start_dt = parse_date(maps.detected_week)
            week_end_dt = week_start_dt + timedelta(days=7)
            if week_start_dt <= photo_dt <= week_end_dt:
                if maps.inferred_tag not in existing_labels:
                    photo.tags.append(Tag(label=maps.inferred_tag, status="suggested"))
                    existing_labels.add(maps.inferred_tag)
        except Exception as e:
            logger.error(f"Error checking maps signal: {e}")

    return photo

def run_startup_signal_matching() -> List[Photo]:
    """
    One-time startup check against all seed photos in photos.json.
    Loads signals, runs apply_signal_matching across all photos, and persists updated state.
    """
    logger.info("Running startup signal-matching check across photo library...")
    signals = data_manager.load_signals()
    photos = data_manager.load_photos()

    updated_photos = []
    for photo in photos:
        updated_photo = apply_signal_matching(photo, signals)
        updated_photos.append(updated_photo)

    data_manager.save_photos(updated_photos)
    logger.info(f"Startup signal matching complete. Updated {len(updated_photos)} photos.")
    return updated_photos
