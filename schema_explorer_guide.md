# Comprehensive Implementation Guide: Schema Explorer & Backend APIs

This guide will be handed to an AI coding assistant to build the **Schema Explorer frontend screens** and **backend APIs** for FuckDB, following the existing UI style and architecture.

---

## 1. Context & Goals
- FuckDB MVP already has authentication, dashboard, and project creation.
- Next feature: **Schema Explorer** where users create and edit data dictionaries.
- **Supabase (Postgres)** → Stores project + dictionary version metadata.
- **MongoDB (Atlas)** → Stores actual schema JSON (tables, columns, relationships, ERD).
- **Frontend** → Next.js (App Router, ShadCN UI, Tailwind) must render schema explorer UI from HTML prototype.
- **Backend** → FastAPI must handle dictionary CRUD and sync between Postgres + Mongo.

---

## 2. Frontend Implementation (Next.js)

### 2.1 New Routes
- `/projects/[id]/explorer` → Schema Explorer UI
- Nested dynamic tabs for tables, columns, ERD view.

### 2.2 UI Components
1. **Left Sidebar (Explorer)**
   - Schema list → collapsible groups.
   - Tables per schema → selectable.
   - Follow style in `schema_explorer.html`【14†schema_explorer.html】.

2. **Main Content Area**
   - Tabbed panel → open multiple tables.
   - Table overview → name, type badge (fact/dimension).
   - Columns table → sortable, editable rows.
   - ERD View (future: integrate `/packages/diagram`).

3. **Right Sidebar (Properties)**
   - Context view → show table/column properties.
   - Editable fields (description, data type, FK/PK toggle).

4. **Modals & Actions**
   - Add Schema, Add Table, Add Column dialogs.
   - Reuse `Dialog`, `Form`, `Input`, `Button` from `/packages/ui`【17†directory-structure.md】.

### 2.3 State Management
- Fetch dictionary JSON via `/projects/{id}/versions/latest`.
- Local state → `openTabs`, `selectedTable`, `selectedColumn`.
- Autosave changes → call PATCH APIs on blur/confirm.
- Show optimistic UI updates.

### 2.4 API Integration
- Use `/apps/web/lib/api.ts` for client.
- New API client methods:
  - `getDictionary(projectId, version?)`
  - `updateTable(projectId, version, tableName, payload)`
  - `updateColumn(projectId, version, tableName, columnName, payload)`
  - `updateERD(projectId, version, erdPayload)`
  - `createSchema`, `createTable`, `createColumn`

---

## 3. Backend Implementation (FastAPI)

### 3.1 API Endpoints【16†fdb_architecture_summary.md】

- **Dictionary Versions**
  - `POST /projects/{projectId}/versions` → create new version (insert in Postgres, insert in Mongo).
  - `GET /projects/{projectId}/versions/latest` → return latest dictionary JSON.
  - `PATCH /projects/{projectId}/versions/{version}` → update dictionary payload.
  - `DELETE /projects/{projectId}/versions/{version}` → delete version.

- **Granular Sync APIs**
  - `PATCH /projects/{projectId}/versions/{version}/tables/{table}` → update table.
  - `PATCH /projects/{projectId}/versions/{version}/tables/{table}/columns/{column}` → update column.
  - `POST /projects/{projectId}/versions/{version}/tables` → add new table.
  - `POST /projects/{projectId}/versions/{version}/tables/{table}/columns` → add new column.
  - `PATCH /projects/{projectId}/versions/{version}/erd` → update ERD layout.

- **Import/Export**
  - `POST /projects/{projectId}/import` → import from CSV/Excel.
  - `GET /projects/{projectId}/versions/{version}/export?dialect=postgres` → SQL export.

### 3.2 Data Model
- **Postgres (Supabase)**
  - `projects (id, owner_id, name, description, created_at)`
  - `dictionary_versions (project_id, version, mongo_id, metadata, created_at)`

- **Mongo (Atlas)** → Collection: `dictionaries`【13†Frontend → Mongo】
  ```json
  {
    "projectId": "uuid",
    "version": 1,
    "schemas": { "tables": [...], "relationships": [...] },
    "erd": { "nodes": [...], "edges": [...] },
    "created_at": ISODate()
  }
  ```

### 3.3 Validation
- Enforce `$jsonSchema` validator in Mongo【13†Frontend → Mongo】.
- Pydantic models in FastAPI for request/response.

---

## 4. Development Steps

1. **Backend**
   - Implement `DictionaryVersion` model in Pydantic.
   - Add new endpoints in `apps/backend/main.py`.
   - Connect Postgres + Mongo via environment variables (`.env.local`).
   - Write CRUD handlers with proper validation.

2. **Frontend**
   - Convert `schema_explorer.html` into React components【14†schema_explorer.html】.
   - Hook API client calls.
   - Add optimistic UI state updates.
   - Ensure consistency with FuckDB design system (spacing, radius, typography)【18†Version.md】.

3. **Testing**
   - Verify creation of schema/tables/columns syncs correctly.
   - Ensure Mongo stores JSON as expected.
   - Ensure Postgres dictionary_versions tracks versions properly.

4. **Versioning**
   - Update `Version.md` for each release【18†Version.md】.

---

## 5. Deliverables
- **Frontend**: Fully functional Schema Explorer UI (sidebar, tabs, content panel, right sidebar).
- **Backend**: CRUD APIs for dictionary versions, tables, columns, ERD.
- **Integration**: End-to-end sync between frontend → backend → Postgres + Mongo.
- **Docs**: Update `new-project-guide.md` with usage.

---

## 6. Future Enhancements
- Real-time collaboration (WebSockets).
- Offline desktop mode (Electron + local Mongo).
- SQL export for multiple dialects.
- AI-assisted schema suggestions.

---

✅ With this structured guide, an AI coding assistant can implement the full Schema Explorer feature, aligned with FuckDB’s UI/UX system and backend architecture.

