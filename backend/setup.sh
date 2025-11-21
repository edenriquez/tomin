#!/bin/bash

# Backend User Registration Setup Script
# This script helps you set up the backend with Supabase and JWT authentication

set -e

echo "🚀 Backend User Registration Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: You need to update DATABASE_URL in .env"
    echo "   1. Go to https://dcmnhxptjegwlatqilkv.supabase.co"
    echo "   2. Navigate to: Project Settings → Database"
    echo "   3. Copy the 'Connection pooling' connection string"
    echo "   4. Replace DATABASE_URL in .env with your connection string"
    echo ""
    read -p "Press Enter after you've updated DATABASE_URL in .env..."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📦 Installing dependencies..."
pip install -e .

echo ""
echo "🗄️  Setting up database migrations..."

# Check if migrations exist
if [ ! -d "alembic/versions" ] || [ -z "$(ls -A alembic/versions)" ]; then
    echo "Creating initial migration..."
    alembic revision --autogenerate -m "Create users table"
else
    echo "✅ Migrations already exist"
fi

echo ""
echo "🔄 Running migrations..."
alembic upgrade head

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start the backend: uvicorn src.index:app --reload --port 8000"
echo "   2. Start the frontend: cd ../frontend && npm run dev"
echo "   3. Test login at: http://localhost:3000/login"
echo ""
echo "📊 Check your users in Supabase:"
echo "   https://dcmnhxptjegwlatqilkv.supabase.co"
echo "   Navigate to: Table Editor → users"
echo ""
