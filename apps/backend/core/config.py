"""
Core configuration module for FuckDB Backend.
Loads environment variables with precedence: env.example → .env.local → system env
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from functools import lru_cache


class Settings:
    """Application settings loaded from environment variables."""
    
    def __init__(self):
        # Load environment files in order of precedence
        self._load_environment_files()
        
        # Supabase Configuration
        self.SUPABASE_URL: str = self._get_env("SUPABASE_URL", required=True)
        self.SUPABASE_ANON_KEY: str = self._get_env("SUPABASE_ANON_KEY", required=True)
        self.SUPABASE_JWT_SECRET: str = self._get_env("SUPABASE_JWT_SECRET", required=True)
        self.SUPABASE_SERVICE_ROLE_KEY: Optional[str] = self._get_env("SUPABASE_SERVICE_ROLE_KEY", required=False)
        
        # MongoDB Configuration
        self.MONGODB_URI: Optional[str] = self._get_env("MONGODB_URI", required=False)
        self.MONGODB_DATABASE: str = self._get_env("MONGODB_DATABASE", default="fuckdb")
        
        # Environment Settings
        self.ENVIRONMENT: str = self._get_env("ENVIRONMENT", default="development")
        self.DEBUG: bool = self._get_env("DEBUG", default="true").lower() in ["true", "1", "yes"]
        self.FRONTEND_URL: str = self._get_env("FRONTEND_URL", default="http://localhost:3000")
        
        # API Configuration
        self.API_HOST: str = self._get_env("API_HOST", default="0.0.0.0")
        self.API_PORT: int = int(self._get_env("API_PORT", default="8000"))
        
        # Logging Configuration
        self.LOG_LEVEL: str = self._get_env("LOG_LEVEL", default="INFO")
        self.LOG_FORMAT: str = self._get_env("LOG_FORMAT", default="json")
        
        # Security Configuration
        self.ALLOWED_ORIGINS: list[str] = self._get_env("ALLOWED_ORIGINS", 
                                                        default="http://localhost:3000,http://127.0.0.1:3000").split(",")
        self.MAX_REQUEST_SIZE: int = int(self._get_env("MAX_REQUEST_SIZE", default="10485760"))
        
        # Optional: Redis Configuration
        self.REDIS_URL: Optional[str] = self._get_env("REDIS_URL", required=False)
        self.REDIS_TTL: int = int(self._get_env("REDIS_TTL", default="3600"))
        
        # Optional: AWS Configuration
        self.AWS_ACCESS_KEY_ID: Optional[str] = self._get_env("AWS_ACCESS_KEY_ID", required=False)
        self.AWS_SECRET_ACCESS_KEY: Optional[str] = self._get_env("AWS_SECRET_ACCESS_KEY", required=False)
        self.AWS_REGION: str = self._get_env("AWS_REGION", default="us-east-1")
        self.AWS_S3_BUCKET: Optional[str] = self._get_env("AWS_S3_BUCKET", required=False)
        
        # Derived settings
        self.IS_PRODUCTION = self.ENVIRONMENT == "production"
        self.IS_DEVELOPMENT = self.ENVIRONMENT == "development"
        
    def _load_environment_files(self):
        """
        Load environment files in order of precedence:
        1. env.example (source of truth for defaults)
        2. .env.local (development overrides)
        3. System environment variables (production/final overrides)
        """
        # Get the base directory (backend folder)
        base_dir = Path(__file__).parent.parent
        project_root = base_dir.parent.parent  # Go up to project root
        
        # Load env.example first (source of truth)
        env_example_path = project_root / "env.example"
        if env_example_path.exists():
            load_dotenv(env_example_path)
        
        # Load .env.local (development overrides)
        env_local_path = base_dir / ".env.local"
        if env_local_path.exists():
            load_dotenv(env_local_path, override=True)
        
        # System environment variables automatically take precedence
        
    def _get_env(self, key: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
        """
        Get environment variable with optional default value.
        
        Args:
            key: Environment variable name
            default: Default value if not found
            required: If True, raise error if not found and no default
            
        Returns:
            Environment variable value or default
            
        Raises:
            ValueError: If required variable is not found
        """
        value = os.getenv(key, default)
        
        if required and value is None:
            raise ValueError(f"Missing required environment variable: {key}")
        
        # Don't return placeholder values from env.example
        if value and value.startswith("your_") and value.endswith("_here"):
            if required:
                raise ValueError(f"Environment variable {key} contains placeholder value. Please set actual value in .env.local")
            return default
            
        return value
    
    def dict(self) -> Dict[str, Any]:
        """Return settings as dictionary (excluding sensitive data)."""
        return {
            "environment": self.ENVIRONMENT,
            "debug": self.DEBUG,
            "frontend_url": self.FRONTEND_URL,
            "api_host": self.API_HOST,
            "api_port": self.API_PORT,
            "log_level": self.LOG_LEVEL,
            "allowed_origins": self.ALLOWED_ORIGINS,
        }


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Create a global settings instance
settings = get_settings()