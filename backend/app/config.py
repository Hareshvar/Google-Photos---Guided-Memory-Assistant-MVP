import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from root project directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_VISION_MODEL_NAME: str = os.getenv("GROQ_VISION_MODEL_NAME", "qwen/qwen3.8-27b")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    BASE_DIR: Path = BASE_DIR
    BACKEND_DIR: Path = BASE_DIR / "backend"
    DATA_DIR: Path = BACKEND_DIR / "app" / "data"
    PHOTOS_DATA_DIR: Path = BASE_DIR / "Photos_Data"

settings = Settings()
