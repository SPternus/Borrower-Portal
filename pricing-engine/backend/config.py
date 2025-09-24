"""
Configuration module for Ternus Pricing Engine
"""
import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database Configuration - Using same PostgreSQL as python-server
    database_url: str = "postgresql://ternus_user:ternus_password@localhost:5432/ternus_borrower"
    
    # Application Settings
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002"
    ]
    
    # Pricing Engine Specific Settings
    enable_audit_logging: bool = True
    rate_precision: int = 4
    cache_duration_minutes: int = 30
    max_rate_adjustment: float = 3.0
    min_rate_adjustment: float = -1.0
    default_margin: float = 2.0
    
    # Excel Integration Settings
    excel_files_path: str = "./excel_files"
    enable_excel_integration: bool = True
    
    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 5001
    api_prefix: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        env_prefix = "PRICING_"

# Global settings instance
settings = Settings()

# Database URL components for manual override
def get_database_url():
    """Get database URL from environment or use default"""
    db_type = os.getenv("DB_TYPE", "postgresql")
    
    if db_type.lower() == "postgresql":
        db_user = os.getenv("DB_USER", "ternus_user")
        db_password = os.getenv("DB_PASSWORD", "ternus_password")
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "ternus_borrower")
        return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    else:
        # Fallback to SQLite
        db_path = os.getenv("DB_PATH", "./ternus_pricing_engine.db")
        return f"sqlite:///{db_path}"

# Override database URL if environment variables are set
if any(os.getenv(var) for var in ["DB_TYPE", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME", "DB_PATH"]):
    settings.database_url = get_database_url()

# Logging configuration
import logging

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler()
        ]
    )
    
    # Suppress SQLAlchemy debug logs in production
    if settings.environment == "production":
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

# Initialize logging
setup_logging() 