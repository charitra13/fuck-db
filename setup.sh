#!/bin/bash

echo "🚀 Setting up FuckDB Monorepo..."

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Please install Node.js first." >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed. Please install pnpm first." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed. Please install Python 3 first." >&2; exit 1; }

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install

# Setup Python backend
echo "🐍 Setting up Python backend..."
cd apps/backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing Python dependencies..."
./venv/bin/pip install -r requirements.txt

cd ../..

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update backend environment variables in apps/backend/.env"
echo "2. Run the development servers:"
echo "   - Frontend + Backend: pnpm dev"
echo "   - Frontend only: pnpm dev:web"
echo "   - Backend only: pnpm dev:backend"
echo ""
echo "📋 Development URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:8000"
