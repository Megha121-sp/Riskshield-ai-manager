import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # App Information
    PROJECT_NAME: str = "RiskShield AI"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "riskshield_db"
    USE_MEMORY_DB_FALLBACK: bool = True

    # Security & Auth
    SECRET_KEY: str = "riskshield-ai-production-super-secret-jwt-key-2026-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # LLM Service Configuration
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.2
    LLM_TIMEOUT_SECONDS: int = 15

    # Risk Scoring Weights (Must sum to 1.0)
    WEIGHT_ML_FRAUD_PROB: float = 0.35
    WEIGHT_ANOMALY: float = 0.20
    WEIGHT_VELOCITY: float = 0.15
    WEIGHT_BEHAVIOURAL: float = 0.15
    WEIGHT_DEVICE: float = 0.10
    WEIGHT_LOCATION: float = 0.05

    # Risk Score Thresholds (0-100)
    THRESHOLD_LOW_RISK: int = 30    # <= 30 => LOW (APPROVE)
    THRESHOLD_HIGH_RISK: int = 70   # > 70  => HIGH (HOLD), 31-70 => MEDIUM (REVIEW)

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    # File paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    ML_MODELS_DIR: str = os.path.join(BASE_DIR, "ml", "models")
    ML_DATA_DIR: str = os.path.join(BASE_DIR, "ml", "data")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"


settings = Settings()
