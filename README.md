# FuckDB - Database Schema Visualizer

A full-stack application for visualizing and managing database schemas, built with Next.js frontend and FastAPI backend in a clean monorepo structure.

## 🏗️ Architecture

```
fuckdb/
├── apps/
│   ├── web/           # Next.js frontend (React, TypeScript, Tailwind)
│   └── backend/       # FastAPI backend (Python, Supabase)
├── packages/
│   ├── ui/            # Shared UI components (@fuckdb/ui)
│   ├── diagram/       # React-flow & ERD utilities (@fuckdb/diagram)
│   └── types/         # TypeScript shared types (@fuckdb/types)
└── infra/             # Infrastructure configs
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v9 or higher)
- Python 3.10+ 

### One-Command Setup

```bash
# Clone the repository
git clone <repo-url>
cd fuckdb

# Run the automated setup script
pnpm run setup
```

This will:
- Install all Node.js dependencies
- Create Python virtual environment
- Install Python dependencies
- Set up environment files

### Manual Setup

If you prefer manual setup:

```bash
# Install Node.js dependencies
pnpm install

# Setup Python backend
cd apps/backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cd ../..
```

## 🔧 Environment Configuration

1. **Backend Environment**: Update `apps/backend/.env.local` with your Supabase credentials:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   SUPABASE_SERVICE_ROLE_KEY=your-service-role (optional)
   ENVIRONMENT=development
   DEBUG=true
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

2. **Frontend Environment** (optional): By default, the frontend proxies `/api/*` to the backend via Next.js rewrites, enabling cookie-based auth. If you prefer direct calls, set:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   ```

## 🎯 Development

```bash
# Run both frontend and backend
pnpm dev

# Run frontend only (http://localhost:3000)
pnpm dev:web

# Run backend only (http://localhost:8000)
pnpm dev:backend

# Build frontend
pnpm build:web
```

## 📦 Package Structure

- **@fuckdb/ui**: Shared UI components (Button, Card, Form, etc.)
- **@fuckdb/types**: TypeScript interfaces and Zod schemas
- **@fuckdb/diagram**: React-flow wrappers and ERD utilities

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS
- Radix UI components
- React Hook Form + Zod validation

**Backend:**
- FastAPI
- Python 3.10+
- Supabase (Auth & Database)
- Uvicorn server

**Development:**
- pnpm workspaces
- ESLint
- Prettier (if configured)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

[Add your license here]