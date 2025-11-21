# Backend User Registration Setup Guide

## Prerequisites

Before running the backend, you need to:

1. **Get Supabase Database Connection String**
   - Go to [Supabase Dashboard](https://dcmnhxptjegwlatqilkv.supabase.co)
   - Navigate to: **Project Settings** → **Database**
   - Under "Connection string", select **Connection pooling** (recommended for serverless)
   - Copy the connection string (it will look like: `postgresql://postgres.[project-ref]:[password]@...`)
   - Replace `[password]` with your actual database password

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```
   
3. **Update DATABASE_URL in .env**
   Replace the placeholder with your actual Supabase connection string

## Installation

Install dependencies:
```bash
pip install -e .
```

## Database Setup

1. **Run migrations to create users table**:
   ```bash
   # Create initial migration (already done if alembic/versions has files)
   alembic revision --autogenerate -m "Create users table"
   
   # Apply migrations to Supabase
   alembic upgrade head
   ```

2. **Verify table creation**:
   - Go to Supabase Dashboard → Table Editor
   - You should see a `users` table with columns: id, email, google_id, name, picture, created_at, updated_at, is_active

## Running the Backend

```bash
uvicorn src.index:app --reload --port 8000
```

## Testing Authentication Flow

1. Start the backend server
2. Navigate to: `http://localhost:8000/api/v1/auth/google`
3. Complete Google OAuth
4. You should be redirected to the frontend dashboard
5. Check Supabase Table Editor to see your user record

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret for signing JWT tokens (using Supabase secret key)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `FRONTEND_URL`: Frontend application URL for redirects
