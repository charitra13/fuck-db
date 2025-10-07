#!/usr/bin/env python3
"""
Test MongoDB connection and create necessary indexes for FuckDB.
Run this script to verify your MongoDB setup is working correctly.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, OperationFailure

# Load environment variables
load_dotenv(".env.local")

def test_mongodb_connection():
    """Test MongoDB connection and set up indexes."""
    
    # Get MongoDB configuration
    mongodb_uri = os.getenv("MONGODB_URI")
    mongodb_database = os.getenv("MONGODB_DATABASE", "fuckdb")
    
    if not mongodb_uri:
        print("❌ Error: MONGODB_URI not found in environment variables")
        print("   Please add MONGODB_URI to your .env.local file")
        return False
    
    print(f"🔗 Connecting to MongoDB...")
    print(f"   Database: {mongodb_database}")
    
    try:
        # Create MongoDB client
        client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            retryWrites=True,
            w='majority'
        )
        
        # Test connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # Get database
        db = client[mongodb_database]
        
        # Get or create dictionaries collection
        collection = db.dictionaries
        print(f"\n📦 Using collection: dictionaries")
        
        # Create indexes for better performance
        print("\n🔨 Creating indexes...")
        
        # Index on project_id and version (compound index)
        collection.create_index([
            ("project_id", ASCENDING),
            ("version", DESCENDING)
        ], name="idx_project_version")
        print("   ✓ Created index: project_id + version")
        
        # Index on project_id alone
        collection.create_index("project_id", name="idx_project_id")
        print("   ✓ Created index: project_id")
        
        # Index on created_at for sorting
        collection.create_index([("created_at", DESCENDING)], name="idx_created_at")
        print("   ✓ Created index: created_at")
        
        # Index on created_by
        collection.create_index("created_by", name="idx_created_by")
        print("   ✓ Created index: created_by")
        
        # Test insert and query
        print("\n🧪 Testing database operations...")
        
        # Insert a test document
        test_doc = {
            "project_id": "test_project_123",
            "version": 1,
            "name": "Test Dictionary",
            "description": "Test dictionary for connection verification",
            "schemas": [
                {
                    "name": "public",
                    "description": "Default public schema",
                    "tables": []
                }
            ],
            "relationships": [],
            "erd": {
                "nodes": [],
                "edges": [],
                "zoom": 1.0,
                "pan_x": 0,
                "pan_y": 0
            },
            "metadata": {"test": True},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "test_user"
        }
        
        # Insert
        result = collection.insert_one(test_doc)
        print(f"   ✓ Successfully inserted test document with ID: {result.inserted_id}")
        
        # Query
        found_doc = collection.find_one({"_id": result.inserted_id})
        if found_doc:
            print(f"   ✓ Successfully retrieved test document")
        
        # Clean up test document
        collection.delete_one({"_id": result.inserted_id})
        print(f"   ✓ Successfully deleted test document")
        
        # Get collection stats
        stats = db.command("collstats", "dictionaries")
        print(f"\n📊 Collection Statistics:")
        print(f"   • Documents: {stats.get('count', 0)}")
        print(f"   • Storage Size: {stats.get('storageSize', 0):,} bytes")
        print(f"   • Total Indexes: {stats.get('nindexes', 0)}")
        
        # List all indexes
        indexes = list(collection.list_indexes())
        print(f"\n🗂️  Available Indexes:")
        for index in indexes:
            print(f"   • {index['name']}: {index['key']}")
        
        print("\n✨ MongoDB setup is complete and working correctly!")
        print("   Your database is ready for FuckDB Schema Explorer.")
        
        # Close connection
        client.close()
        return True
        
    except ConnectionFailure as e:
        print(f"\n❌ Failed to connect to MongoDB:")
        print(f"   {str(e)}")
        print("\n💡 Troubleshooting tips:")
        print("   1. Check if your MongoDB URI is correct")
        print("   2. Ensure your IP address is whitelisted in MongoDB Atlas")
        print("   3. Verify your username and password are correct")
        print("   4. Check your internet connection")
        return False
        
    except OperationFailure as e:
        print(f"\n❌ MongoDB operation failed:")
        print(f"   {str(e)}")
        print("\n💡 This might be a permissions issue.")
        print("   Make sure your MongoDB user has read/write permissions.")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error:")
        print(f"   {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("FuckDB MongoDB Connection Test")
    print("=" * 50)
    
    success = test_mongodb_connection()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n⚠️  Please fix the issues above before proceeding.")
        sys.exit(1)