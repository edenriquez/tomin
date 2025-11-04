"""
FastAPI application entry point with clean architecture.
"""
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from infrastructure.api.routes import api_router
app = FastAPI(
    title=settings.APP_NAME,
    description="A FastAPI application with clean architecture",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application with clean architecture.
    """
    # Initialize FastAPI application


    # Include API routes
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app

# Create the application instance
app = create_application()
