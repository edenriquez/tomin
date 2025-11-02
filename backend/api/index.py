"""
Vercel Serverless Function Entry Point
"""
import sys
import os
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Import the FastAPI app from your project
from src.main import app as application

# This is required by Vercel to work with serverless functions
def handler(req, context):
    from mangum import Mangum
    handler = Mangum(application)
    return handler(req, context)
