import os

class Settings:
    PROJECT_NAME: str = "PulseMind AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "pulsemind_super_secret_key_for_hackathon_2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Use SQLite by default for easy hackathon setup, fallback to PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pulsemind.db")
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
