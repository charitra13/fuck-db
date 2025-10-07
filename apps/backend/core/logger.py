"""
Logging configuration module for FuckDB Backend.
Sets up structured logging with JSON format for production.
"""

import logging
import logging.config
import sys
from typing import Dict, Any
from .config import settings
import json


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, "extra"):
            log_obj.update(record.extra)
        
        return json.dumps(log_obj)


def setup_logging() -> None:
    """
    Configure logging for the application.
    Uses JSON format in production, human-readable format in development.
    """
    # Base logging configuration
    log_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(funcName)s() - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": JSONFormatter,
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "default" if settings.LOG_FORMAT != "json" else "json",
                "stream": "ext://sys.stdout",
            },
            "error_console": {
                "class": "logging.StreamHandler",
                "level": "ERROR",
                "formatter": "detailed",
                "stream": "ext://sys.stderr",
            },
        },
        "root": {
            "level": settings.LOG_LEVEL,
            "handlers": ["console", "error_console"],
        },
        "loggers": {
            # Application loggers
            "apps.backend": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"],
                "propagate": False,
            },
            # FastAPI/Uvicorn loggers
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console", "error_console"],
                "propagate": False,
            },
            # Reduce noise from third-party libraries
            "httpx": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
            "httpcore": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
            "pymongo": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
        },
    }
    
    # Add file handler in production
    if settings.IS_PRODUCTION:
        log_config["handlers"]["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": settings.LOG_LEVEL,
            "formatter": "json",
            "filename": "logs/fuckdb.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "encoding": "utf-8",
        }
        log_config["root"]["handlers"].append("file")
        log_config["loggers"]["apps.backend"]["handlers"].append("file")
    
    # Apply configuration
    logging.config.dictConfig(log_config)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(
        "Logging configured",
        extra={
            "environment": settings.ENVIRONMENT,
            "log_level": settings.LOG_LEVEL,
            "log_format": settings.LOG_FORMAT,
        }
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


# Setup logging on module import
setup_logging()