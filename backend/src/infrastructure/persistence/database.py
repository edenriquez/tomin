"""Database configuration and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

# Base class for SQLAlchemy models
Base = declarative_base()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Only raise error if we're not in a migration context
if not DATABASE_URL:
    # Check if we're running in Alembic context
    import sys
    if 'alembic' not in sys.argv[0]:
        raise ValueError("DATABASE_URL environment variable is not set")
    DATABASE_URL = ""  # Placeholder for Alembic

# Convert postgres:// to postgresql:// if needed (for compatibility)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# For async operations, use asyncpg driver
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if DATABASE_URL else ""

# Create async engine for Supabase PostgreSQL (for application use)
# Using NullPool for serverless environments (Vercel)
if ASYNC_DATABASE_URL:
    # For PgBouncer compatibility, we need to disable prepared statements
    # This is done by adding query parameters to the connection URL
    pgbouncer_url = ASYNC_DATABASE_URL
    if "?" in pgbouncer_url:
        pgbouncer_url += "&prepared_statement_cache_size=0"
    else:
        pgbouncer_url += "?prepared_statement_cache_size=0"
    
    engine = create_async_engine(
        pgbouncer_url,
        echo=True,  # Set to False in production
        poolclass=NullPool,  # Important for serverless
        future=True,
        pool_pre_ping=True,  # Verify connections before using
    )

    # Create async session factory
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
else:
    engine = None
    AsyncSessionLocal = None


async def get_db() -> AsyncSession:
    """Dependency for getting database sessions."""
    if not AsyncSessionLocal:
        raise ValueError("Database not configured")
    
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    if not engine:
        raise ValueError("Database not configured")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections."""
    if engine:
        await engine.dispose()

