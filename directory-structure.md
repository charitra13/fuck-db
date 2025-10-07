## Project Structure

fuckdb/
├── 📁 apps/                          # Application code
│   ├── 📁 backend/                   # Python FastAPI backend
│   │   ├── 📁 __pycache__/          # Python cache files
│   │   ├── 📁 venv/                 # Python virtual environment
│   │   │   ├── 📁 bin/              # Virtual env executables
│   │   │   ├── 📁 include/          # Python includes
│   │   │   └── 📁 lib/              # Python packages
│   │   ├── auth_utils.py            # Authentication utilities
│   │   ├── auth.py                  # Authentication module
│   │   ├── env.example              # Environment variables example
│   │   ├── main.py                  # FastAPI main application
│   │   ├── package.json             # Node.js package config
│   │   ├── requirements.txt         # Python dependencies
│   │   └── setup_users_rls_policies.sql  # Database setup
│   └── 📁 web/                      # Next.js frontend
│       ├── 📁 app/                  # Next.js app directory
│       │   ├── 📁 dashboard/        # Dashboard page
│       │   ├── 📁 login/            # Login page
│       │   ├── 📁 projects/         # Projects page
│       │   ├── 📁 signup/           # Signup page
│       │   ├── favicon.ico          # Site favicon
│       │   ├── globals.css          # Global styles
│       │   ├── layout.tsx           # Root layout
│       │   └── page.tsx             # Home page
│       ├── 📁 components/           # React components
│       │   └── 📁 ui/               # UI components (empty)
│       ├── 📁 lib/                  # Utility libraries
│       │   ├── api.ts               # API client
│       │   └── utils.ts             # Utility functions
│       ├── 📁 public/               # Static assets
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── 📁 node_modules/         # Node.js dependencies
│       ├── components.json          # UI components config
│       ├── next-env.d.ts            # Next.js type definitions
│       ├── next.config.ts           # Next.js configuration
│       ├── package.json             # Frontend dependencies
│       ├── postcss.config.mjs       # PostCSS configuration
│       └── tsconfig.json            # TypeScript configuration
├── 📁 packages/                     # Shared packages
│   ├── 📁 diagram/                  # Diagram package
│   │   ├── 📁 node_modules/         # Package dependencies
│   │   ├── package.json             # Package config
│   │   └── 📁 src/                  # Source code
│   │       └── index.ts             # Main export
│   ├── 📁 types/                    # TypeScript types package
│   │   ├── 📁 node_modules/         # Package dependencies
│   │   ├── package.json             # Package config
│   │   └── 📁 src/                  # Source code
│   │       └── index.ts             # Main export
│   └── 📁 ui/                       # UI components package
│       ├── 📁 node_modules/         # Package dependencies
│       ├── package.json             # Package config
│       └── 📁 src/                  # Source code
│           ├── alert.tsx            # Alert component
│           ├── button.tsx           # Button component
│           ├── card.tsx             # Card component
│           ├── dialog.tsx           # Dialog component
│           ├── form.tsx             # Form component
│           ├── index.ts             # Main export
│           ├── input.tsx            # Input component
│           ├── label.tsx            # Label component
│           ├── loading-spinner.tsx  # Loading spinner
│           ├── skip-navigation.tsx  # Skip navigation component
│           ├── tabs.tsx             # Tabs component
│           ├── textarea.tsx         # Textarea component
│           └── utils.ts             # Utility functions
├── 📁 infra/                        # Infrastructure (empty)
├── 📁 node_modules/                 # Root dependencies
├── 📄 ai_agent.md                   # AI agent documentation
├── 📄 CLAUDE.md                     # Claude AI documentation
├── 📄 directory-structure.md        # Project structure documentation
├── 📄 eslint.config.mjs             # ESLint configuration
├── 📄 fuckdb-ui-consistency-report.md  # UI consistency report
├── 📄 GEMINI.md                     # Gemini AI documentation
├── 📄 new-project-guide.md          # New project guide
├── 📄 package.json                  # Root package configuration
├── 📄 pnpm-lock.yaml                # PNPM lock file
├── 📄 pnpm-workspace.yaml           # PNPM workspace configuration
├── 📄 README.md                     # Project documentation
├── 📄 setup.sh                      # Setup script
├── 📄 tsconfig.json                 # Root TypeScript configuration
├── 📄 Version.md                    # Version tracking
└── 📄 WARP.md                       # Warp AI documentation


## Project Overview
This is a **monorepo** structure using **PNPM workspaces** with:
- Backend: Python FastAPI application with authentication
- Frontend: Next.js React application with TypeScript
- Shared Packages: UI components, types, and diagram utilities
- Documentation: Multiple AI assistant guides and project documentation

The project follows a modern full-stack architecture with shared component libraries and proper separation of concerns.