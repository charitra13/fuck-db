/* eslint-disable @typescript-eslint/no-explicit-any */
/*
  API client for FuckDB frontend
  - Wraps HTTPS REST calls to the FastAPI backend
  - Uses cookies for auth (credentials: 'include')
*/

export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ---------- Helpers ----------

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = RequestInit & {
  parse?: "json" | "text" | "raw";
  requireAuth?: boolean;
};

async function request<T = any>(path: string, method: HttpMethod, body?: any, opts: RequestOptions = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  const init: RequestInit = {
    method,
    credentials: "include", // send cookies for auth
    headers,
    ...opts,
  };

  if (body !== undefined) {
    (headers as any)["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);

  // Try to parse JSON, but allow text if requested
  const contentType = res.headers.get("content-type") || "";
  const shouldParseJson = (opts.parse ?? "json") === "json" && contentType.includes("application/json");
  const data = shouldParseJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    // Normalize error shape
    const msg = (data && (data.message || data.detail)) || res.statusText || "Request failed";
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

// Some endpoints return different shapes; helpers normalize
function unwrapData<T = any>(payload: any, key?: string): T {
  if (!payload) return payload as T;
  if (typeof payload === "object") {
    if (key && payload[key] !== undefined) return payload[key] as T;
    if (payload.data !== undefined) return payload.data as T;
  }
  return payload as T;
}

// ---------- Types (UI-friendly) ----------

export type Project = {
  id: string;
  owner_id?: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type Column = {
  name: string;
  type: string; // e.g., varchar(255)
  isPK?: boolean;
  isFK?: boolean;
  isNullable?: boolean;
  description?: string;
};

export type Table = {
  name: string;
  type: "fact" | "dimension" | "bridge" | "staging" | string;
  description?: string;
  columns: Column[];
};

export type Schema = {
  name: string;
  tables: Record<string, Table>;
};

// Backend dictionary structures (partial)
export type BackendDictionary = {
  project_id: string;
  version: number;
  name?: string;
  description?: string;
  schemas: Array<{ name: string; description?: string; tables: Array<any> } | any>;
  relationships?: any[];
  erd?: any;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

// Map Supabase project row -> UI Project
function mapApiProject(p: any): Project {
  return {
    id: p.id,
    owner_id: p.owner_id,
    name: p.name,
    description: p.description ?? undefined,
    createdAt: p.created_at ?? new Date().toISOString(),
    updatedAt: p.updated_at ?? p.created_at ?? null,
  };
}

// Map Backend dictionary -> UI schemas record
export function mapDictionaryToSchemasUI(dict: BackendDictionary): Record<string, Schema> {
  const result: Record<string, Schema> = {};
  if (!dict) return result;

  // Handle new MongoDB structure where schemas is an object with tables array
  if (dict.schemas && typeof dict.schemas === 'object' && !Array.isArray(dict.schemas)) {
    const schemasObj = dict.schemas as any
    // Check if it has a 'tables' property with an array
    if ('tables' in schemasObj && Array.isArray(schemasObj.tables)) {
      // Group tables by their schema_name property
      const tablesBySchema: Record<string, any[]> = {}
      
      for (const table of schemasObj.tables) {
        const schemaName = table.schema_name || table.schemaName || "public";
        if (!tablesBySchema[schemaName]) {
          tablesBySchema[schemaName] = [];
        }
        tablesBySchema[schemaName].push(table);
      }
      
      // Process each schema group
      for (const [schemaName, schemaTables] of Object.entries(tablesBySchema)) {
        const tables: Record<string, Table> = {};
        
        for (const t of schemaTables) {
          const tableName = t.name;
          const tableType = (t.table_type || t.type || "dimension") as Table["type"];
          const columnsArr: any[] = Array.isArray(t.columns) ? t.columns : [];
          const columns: Column[] = columnsArr.map((c: any) => ({
            name: c.name,
            type: c.data_type || c.type || "text",
            isPK: (c.key === "PK" || c.key === "PRIMARY") || c.isPK === true,
            isFK: (c.key === "FK" || c.key === "FOREIGN") || c.isFK === true,
            isNullable: c.nullable !== false, // default true
            description: c.description,
          }));
          tables[tableName] = {
            name: tableName,
            type: tableType,
            description: t.description,
            columns,
          };
        }
        
        result[schemaName] = {
          name: schemaName,
          tables,
        };
      }
      
      return result;
    }
  }

  // Handle old array format for backward compatibility
  if (Array.isArray(dict.schemas)) {
    for (const s of dict.schemas as any[]) {
      const schemaName = s.name || "public";
      const tablesArr: any[] = Array.isArray(s.tables) ? s.tables : [];
      const tables: Record<string, Table> = {};

      for (const t of tablesArr) {
        const tableName = t.name;
        const tableType = (t.table_type || t.type || "dimension") as Table["type"];
        const columnsArr: any[] = Array.isArray(t.columns) ? t.columns : [];
        const columns: Column[] = columnsArr.map((c: any) => ({
          name: c.name,
          type: c.data_type || c.type || "text",
          isPK: (c.key === "PRIMARY") || c.isPK === true,
          isFK: (c.key === "FOREIGN") || c.isFK === true,
          isNullable: c.nullable !== false, // default true
          description: c.description,
        }));
        tables[tableName] = {
          name: tableName,
          type: tableType,
          description: t.description,
          columns,
        };
      }

      result[schemaName] = {
        name: schemaName,
        tables,
      };
    }
  }

  return result;
}

// ---------- API: Auth ----------
export const authApi = {
  signup: (email: string, password: string, full_name?: string) =>
    request("/api/v1/auth/signup", "POST", { email, password, full_name }),

  login: (email: string, password: string) =>
    request("/api/v1/auth/login", "POST", { email, password }),

  logout: () => request("/api/v1/auth/logout", "POST"),

  me: () => request("/api/v1/auth/me", "GET"),

  profile: () => request("/api/v1/auth/profile", "GET"),
};

// ---------- API: Projects ----------
export const projectsApi = {
  async list(limit = 100, offset = 0): Promise<Project[]> {
    const res = await request<any>(`/api/v1/projects?limit=${limit}&offset=${offset}`, "GET");
    // projects endpoint returns { status, projects, total }
    const items = (res && res.projects) || unwrapData(res, "projects") || [];
    return items.map(mapApiProject);
  },

  async create(input: { name: string; description?: string | null }): Promise<Project> {
    const res = await request<any>("/api/v1/projects", "POST", input);
    // returns { status, project }
    const detail = (res && res.project) || unwrapData(res, "project") || res;
    return mapApiProject(detail);
  },

  async get(projectId: string): Promise<Project> {
    const res = await request<any>(`/api/v1/projects/${projectId}`, "GET");
    const detail = (res && res.project) || unwrapData(res, "project") || res;
    return mapApiProject(detail);
  },

  async update(projectId: string, input: { name?: string; description?: string | null }): Promise<Project> {
    const res = await request<any>(`/api/v1/projects/${projectId}`, "PUT", input);
    const detail = (res && res.project) || unwrapData(res, "project") || res;
    return mapApiProject(detail);
  },

  async remove(projectId: string): Promise<{ status: string } | void> {
    const res = await request<any>(`/api/v1/projects/${projectId}`, "DELETE");
    return res;
  },
};

// ---------- API: Versions ----------
export const versionsApi = {
  async list(projectId: string): Promise<any[]> {
    const res = await request<any>(`/api/v1/projects/${projectId}/versions`, "GET");
    const data = unwrapData(res) as any;
    return (data?.versions ?? []);
  },

  async latest(projectId: string): Promise<{ version: any | null; dictionary: BackendDictionary | null }> {
    const res = await request<any>(`/api/v1/projects/${projectId}/versions/latest`, "GET");
    const data = unwrapData(res) as any;
    
    // Better error handling and data validation
    if (!data) {
      return { version: null, dictionary: null };
    }
    
    return { 
      version: data?.version ?? null, 
      dictionary: data?.dictionary ?? null 
    };
  },

  async get(projectId: string, version: number): Promise<{ version: any; dictionary: BackendDictionary | null }> {
    const res = await request<any>(`/api/v1/projects/${projectId}/versions/${version}`, "GET");
    const data = unwrapData(res) as any;
    return { version: data?.version, dictionary: data?.dictionary ?? null };
  },

  create: (projectId: string, payload: any) => request(`/api/v1/projects/${projectId}/versions`, "POST", payload),
  update: (projectId: string, version: number, payload: any) => request(`/api/v1/projects/${projectId}/versions/${version}`, "PUT", payload),
  remove: (projectId: string, version: number) => request(`/api/v1/projects/${projectId}/versions/${version}`, "DELETE"),
};

// ---------- API: Tables (paths reflect backend) ----------
export const tablesApi = {
  list: (projectId: string, version: number, schema_name = "public") =>
    request(`/api/v1/tables/projects/${projectId}/versions/${version}/tables?schema_name=${encodeURIComponent(schema_name)}`, "GET"),

  create: (projectId: string, version: number, payload: any) =>
    request(`/api/v1/tables/projects/${projectId}/versions/${version}/tables`, "POST", payload),

  get: (projectId: string, version: number, table_name: string, schema_name = "public") =>
    request(`/api/v1/tables/projects/${projectId}/versions/${version}/tables/${encodeURIComponent(table_name)}?schema_name=${encodeURIComponent(schema_name)}`, "GET"),

  patch: (projectId: string, version: number, table_name: string, payload: any) =>
    request(`/api/v1/tables/projects/${projectId}/versions/${version}/tables/${encodeURIComponent(table_name)}`, "PATCH", payload),

  remove: (projectId: string, version: number, table_name: string, schema_name = "public") =>
    request(`/api/v1/tables/projects/${projectId}/versions/${version}/tables/${encodeURIComponent(table_name)}?schema_name=${encodeURIComponent(schema_name)}`, "DELETE"),
  
  deleteColumn: (projectId: string, version: number, table_name: string, column_name: string, schema_name = "public") =>
    request(`/api/v1/tables/projects/${projectId}/versions/${version}/tables/${encodeURIComponent(table_name)}/columns/${encodeURIComponent(column_name)}?schema_name=${encodeURIComponent(schema_name)}`, "DELETE"),
};

// ---------- API: Health ----------
export const healthApi = {
  root: () => request("/", "GET"),
  health: () => request("/health", "GET"),
};