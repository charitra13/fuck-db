"""
Database connection module for FuckDB Backend.
Manages connections to Supabase (PostgreSQL) and MongoDB.
"""

from typing import Optional
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from functools import lru_cache
from .config import settings
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections for the application."""
    
    def __init__(self):
        self._supabase_client: Optional[Client] = None
        self._mongo_client = None
        self._mongo_db = None
        
    @property
    def supabase(self) -> Client:
        """Get Supabase client instance."""
        if self._supabase_client is None:
            self._supabase_client = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_ANON_KEY
            )
            logger.info("Supabase client initialized")
        return self._supabase_client
    
    def get_authenticated_supabase(self, jwt_token: str) -> Client:
        """
        Get Supabase client authenticated with user's JWT token.
        This is used for RLS-protected operations.
        
        Args:
            jwt_token: User's JWT token
            
        Returns:
            Authenticated Supabase client
        """
        options = ClientOptions(
            headers={"Authorization": f"Bearer {jwt_token}"}
        )
        return create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY,
            options=options
        )
    
    @property
    def mongodb(self):
        """Get MongoDB database instance."""
        if self._mongo_db is None:
            if not settings.MONGODB_URI:
                logger.warning("MongoDB URI not configured")
                return None
                
            try:
                from pymongo import MongoClient
                from pymongo.errors import ConnectionFailure
                
                self._mongo_client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    retryWrites=True,
                    w='majority'
                )
                
                # Test connection
                self._mongo_client.admin.command('ping')
                
                self._mongo_db = self._mongo_client[settings.MONGODB_DATABASE]
                logger.info(f"MongoDB connected to database: {settings.MONGODB_DATABASE}")
                
            except ImportError:
                logger.error("pymongo not installed. Install with: pip install pymongo")
                return None
            except ConnectionFailure as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
                return None
            except Exception as e:
                logger.error(f"MongoDB connection error: {e}")
                return None
                
        return self._mongo_db
    
    def close_connections(self):
        """Close all database connections."""
        if self._mongo_client:
            self._mongo_client.close()
            self._mongo_client = None
            self._mongo_db = None
            logger.info("MongoDB connection closed")
        
        # Supabase client doesn't need explicit closing
        self._supabase_client = None


@lru_cache()
def get_database_manager() -> DatabaseManager:
    """
    Get cached database manager instance.
    Uses lru_cache to ensure single instance across the application.
    """
    return DatabaseManager()


# Global database manager instance
db_manager = get_database_manager()

# Convenience exports
supabase = db_manager.supabase

def get_mongodb():
    """Get MongoDB database instance."""
    return db_manager.mongodb

def get_authenticated_supabase(jwt_token: str) -> Client:
    """Get authenticated Supabase client with user's JWT token."""
    return db_manager.get_authenticated_supabase(jwt_token)