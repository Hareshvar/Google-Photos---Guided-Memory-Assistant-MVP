import json
import logging
from pathlib import Path
from typing import List
from app.config import settings
from app.models.schemas import Photo, SignalsData

logger = logging.getLogger(__name__)

DEFAULT_PHOTOS_SEED = [
  {
    "id": "newjob_01",
    "filename": "newjob_01.jpg.jpg",
    "timestamp": "2025-12-02",
    "tags": [
      {
        "label": "Started New Job",
        "status": "suggested"
      }
    ]
  },
  {
    "id": "newjob_02",
    "filename": "newjob_02.jpg.png",
    "timestamp": "2025-12-09",
    "tags": [
      {
        "label": "Started New Job",
        "status": "suggested"
      }
    ]
  },
  {
    "id": "newcity_01",
    "filename": "newcity_01.jpg.png",
    "timestamp": "2023-08-08",
    "tags": [
      {
        "label": "Moved to New City",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "newcity_02",
    "filename": "newcity_02.jpg.png",
    "timestamp": "2023-08-12",
    "tags": [
      {
        "label": "Moved to New City",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "goa_01",
    "filename": "goa_01.jpg.png",
    "timestamp": "2024-06-15",
    "tags": [
      {
        "label": "Goa Trip",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "goa_02",
    "filename": "goa_02.jpg.png",
    "timestamp": "2024-06-15",
    "tags": [
      {
        "label": "Goa Trip",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "goa_03",
    "filename": "goa_03.jpg.png",
    "timestamp": "2024-06-16",
    "tags": [
      {
        "label": "Goa Trip",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "goa_04",
    "filename": "goa_04.jpg.png",
    "timestamp": "2024-06-16",
    "tags": [
      {
        "label": "Goa Trip",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "goa_05",
    "filename": "goa_05.jpg.png",
    "timestamp": "2024-06-17",
    "tags": [
      {
        "label": "Goa Trip",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "diwali_01",
    "filename": "diwali_01.jpg.png",
    "timestamp": "2023-11-12",
    "tags": [
      {
        "label": "Diwali 2023",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "diwali_02",
    "filename": "diwali_02.jpg.png",
    "timestamp": "2023-11-12",
    "tags": [
      {
        "label": "Diwali 2023",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "diwali_03",
    "filename": "diwali_03.jpg.png",
    "timestamp": "2023-11-12",
    "tags": [
      {
        "label": "Diwali 2023",
        "status": "confirmed"
      }
    ]
  },
  {
    "id": "general_01",
    "filename": "general_01.jpg.png",
    "timestamp": "2022-09-10",
    "tags": []
  },
  {
    "id": "general_02",
    "filename": "general_02.jpg.png",
    "timestamp": "2023-02-20",
    "tags": []
  },
  {
    "id": "general_03",
    "filename": "general_03.jpg.png",
    "timestamp": "2023-07-05",
    "tags": []
  },
  {
    "id": "general_04",
    "filename": "general_04.jpg.png",
    "timestamp": "2023-01-15",
    "tags": []
  },
  {
    "id": "general_05",
    "filename": "general_05.jpg.png",
    "timestamp": "2023-03-30",
    "tags": []
  }
]

class DataManager:
    def __init__(self, data_dir: Path = settings.DATA_DIR):
        self.data_dir = data_dir
        self.photos_file = data_dir / "photos.json"
        self.signals_file = data_dir / "signals.json"

    def load_signals(self) -> SignalsData:
        if not self.signals_file.exists():
            logger.warning(f"Signals file not found at {self.signals_file}")
            return SignalsData()
        try:
            with open(self.signals_file, "r", encoding="utf-8") as f:
                content = json.load(f)
                return SignalsData(**content)
        except Exception as e:
            logger.error(f"Error loading signals.json: {e}")
            return SignalsData()

    def load_photos(self) -> List[Photo]:
        if not self.photos_file.exists():
            logger.warning(f"Photos file not found at {self.photos_file}")
            return self.reset_to_default()
        try:
            with open(self.photos_file, "r", encoding="utf-8") as f:
                raw_photos = json.load(f)
                return [Photo(**p) for p in raw_photos]
        except Exception as e:
            logger.error(f"Error loading photos.json: {e}")
            return self.reset_to_default()

    def save_photos(self, photos: List[Photo]) -> bool:
        try:
            dict_photos = [p.model_dump() for p in photos]
            with open(self.photos_file, "w", encoding="utf-8") as f:
                json.dump(dict_photos, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving photos.json: {e}")
            return False

    def reset_to_default(self) -> List[Photo]:
        """Reset photos.json to default seed dataset."""
        logger.info("Resetting photos database to default seed state...")
        photos = [Photo(**p) for p in DEFAULT_PHOTOS_SEED]
        self.save_photos(photos)
        return photos

data_manager = DataManager()
