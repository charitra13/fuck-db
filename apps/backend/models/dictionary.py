"""
Dictionary and Schema models for FuckDB Backend.
Defines the structure for data dictionaries, tables, columns, and ERD.
"""

from typing import Dict, List, Optional, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, computed_field
from enum import Enum


# =============================
# Enums
# =============================
class TableType(str, Enum):
    """Table types for classification."""
    FACT = "fact"
    DIMENSION = "dimension"
    LOOKUP = "lookup"
    STAGING = "staging"
    AGGREGATE = "aggregate"
    VIEW = "view"


class ColumnKey(str, Enum):
    """Column key types."""
    PRIMARY = "PK"
    FOREIGN = "FK"
    UNIQUE = "UK"
    INDEX = "IX"
    NONE = ""


class RelationshipType(str, Enum):
    """Relationship cardinality types."""
    ONE_TO_ONE = "1:1"
    ONE_TO_MANY = "1:N"
    MANY_TO_MANY = "N:N"


# =============================
# Core Schema Models
# =============================
class Column(BaseModel):
    """Column definition model."""
    model_config = ConfigDict(use_enum_values=True)
    
    name: str
    data_type: str = Field(..., serialization_alias="type")
    key: Optional[ColumnKey] = ColumnKey.NONE
    nullable: bool = True
    default_value: Optional[str] = None
    description: Optional[str] = None
    length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
    is_unique: bool = False
    is_indexed: bool = False
    foreign_key_table: Optional[str] = Field(None, serialization_alias="refTable")
    foreign_key_column: Optional[str] = Field(None, serialization_alias="refColumn")
    
    # UI metadata
    ui_order: Optional[int] = None
    ui_hidden: bool = False
    
    @computed_field
    @property
    def isPK(self) -> bool:
        """Computed field for MongoDB: is this a primary key?"""
        return self.key == ColumnKey.PRIMARY
    
    @computed_field
    @property
    def isFK(self) -> bool:
        """Computed field for MongoDB: is this a foreign key?"""
        return self.key == ColumnKey.FOREIGN


class Relationship(BaseModel):
    """Relationship between tables."""
    model_config = ConfigDict(use_enum_values=True)
    
    id: str
    name: Optional[str] = None
    source_table: str = Field(..., serialization_alias="fromTable")
    source_column: str = Field(..., serialization_alias="fromColumn")
    target_table: str = Field(..., serialization_alias="toTable")
    target_column: str = Field(..., serialization_alias="toColumn")
    relationship_type: RelationshipType = Field(RelationshipType.ONE_TO_MANY, serialization_alias="type")
    on_delete: Literal["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"] = "NO ACTION"
    on_update: Literal["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"] = "NO ACTION"
    description: Optional[str] = None


class Table(BaseModel):
    """Table definition model."""
    model_config = ConfigDict(use_enum_values=True)
    
    name: str
    schema_name: str = "public"
    table_type: TableType = Field(TableType.DIMENSION, serialization_alias="type")
    description: Optional[str] = None
    columns: List[Column] = Field(default_factory=list)
    indexes: List[Dict[str, Any]] = Field(default_factory=list)
    constraints: List[Dict[str, Any]] = Field(default_factory=list)
    
    # UI metadata
    ui_color: Optional[str] = None
    ui_icon: Optional[str] = None
    ui_order: Optional[int] = None


class Schema(BaseModel):
    """Database schema containing tables."""
    name: str
    description: Optional[str] = None
    tables: List[Table] = Field(default_factory=list)
    is_collapsed: bool = False  # UI state


# =============================
# ERD Models
# =============================
class ERDNode(BaseModel):
    """ERD node representing a table position."""
    id: str  # table name
    x: int
    y: int
    icon: Optional[str] = None
    width: float = 200
    height: float = 150


class ERDEdge(BaseModel):
    """ERD edge representing a relationship."""
    id: str  # relationship id
    source: str = Field(..., serialization_alias="from")  # source table
    target: str = Field(..., serialization_alias="to")  # target table
    edge_type: Optional[str] = Field(None, serialization_alias="type")
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    animated: bool = False
    label: Optional[str] = None


class ERDLayout(BaseModel):
    """ERD layout configuration."""
    nodes: List[ERDNode] = Field(default_factory=list)
    edges: List[ERDEdge] = Field(default_factory=list)
    zoom: float = 1.0
    pan_x: float = 0
    pan_y: float = 0


# =============================
# Dictionary Models
# =============================
class Dictionary(BaseModel):
    """Complete data dictionary structure."""
    model_config = ConfigDict(use_enum_values=True)
    
    project_id: str
    version: int
    name: str
    description: Optional[str] = None
    schemas: List[Schema] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)
    erd: ERDLayout = Field(default_factory=ERDLayout)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    
    def get_table(self, table_name: str, schema_name: str = "public") -> Optional[Table]:
        """Get a table by name and schema."""
        for schema in self.schemas:
            if schema.name == schema_name:
                for table in schema.tables:
                    if table.name == table_name:
                        return table
        return None
    
    def get_all_tables(self) -> List[Table]:
        """Get all tables across all schemas."""
        tables = []
        for schema in self.schemas:
            tables.extend(schema.tables)
        return tables


class DictionaryVersion(BaseModel):
    """Dictionary version metadata stored in Postgres."""
    id: str
    project_id: str
    version: int
    mongo_id: str  # MongoDB document ID
    name: str
    description: Optional[str] = None
    is_latest: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    created_by: Optional[str] = None


# =============================
# Request/Response Models
# =============================
class CreateVersionRequest(BaseModel):
    """Request to create a new dictionary version."""
    name: str
    description: Optional[str] = None
    base_version: Optional[int] = None  # Version to copy from
    schemas: List[Schema] = Field(default_factory=list)


class UpdateVersionRequest(BaseModel):
    """Request to update dictionary version."""
    name: Optional[str] = None
    description: Optional[str] = None
    schemas: Optional[List[Schema]] = None
    relationships: Optional[List[Relationship]] = None
    erd: Optional[ERDLayout] = None
    metadata: Optional[Dict[str, Any]] = None


class VersionResponse(BaseModel):
    """Response containing version details."""
    id: str
    project_id: str
    version: int
    name: str
    description: Optional[str] = None
    is_latest: bool
    dictionary: Optional[Dictionary] = None
    created_at: datetime
    created_by: Optional[str] = None


class TableRequest(BaseModel):
    """Request to create or update a table."""
    name: str
    schema_name: str = "public"
    table_type: TableType = TableType.DIMENSION
    description: Optional[str] = None
    columns: List[Column] = Field(default_factory=list)


class ColumnRequest(BaseModel):
    """Request to create or update a column."""
    name: str
    data_type: str
    key: Optional[ColumnKey] = ColumnKey.NONE
    nullable: bool = True
    default_value: Optional[str] = None
    description: Optional[str] = None
    length: Optional[int] = None
    is_unique: bool = False
    is_indexed: bool = False


class ERDUpdateRequest(BaseModel):
    """Request to update ERD layout."""
    nodes: List[ERDNode]
    edges: List[ERDEdge]
    zoom: Optional[float] = 1.0
    pan_x: Optional[float] = 0
    pan_y: Optional[float] = 0