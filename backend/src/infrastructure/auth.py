import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# We expect the frontend to send the token in the Authorization header: Bearer <token>
security = HTTPBearer()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Validates the bearer token using Supabase Auth.
    Returns the user_id (sub) from the token if valid.
    """
    token = credentials.credentials
    
    try:
        # Validate the token by getting the user from Supabase Auth
        # This checks if the session is active and valid on the server side
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or user session not found"
            )
            
        return user_response.user.id
        
    except Exception as e:
        # Supabase client usually raises exceptions for invalid/expired tokens
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
        )
