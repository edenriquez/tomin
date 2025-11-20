# Backend Vercel Deployment Fix

## Issue
The deployment was failing with:
```
ModuleNotFoundError: No module named 'aiohttp'
```

## Root Cause
The `aiohttp` dependency was missing from the project dependencies. Your `auth_service.py` and `oauth_utils.py` both use `aiohttp` for making HTTP requests to Google's OAuth endpoints, but it wasn't listed in the dependencies.

## Fix Applied

### 1. Updated `pyproject.toml`
Added `aiohttp>=3.9.0` to the dependencies list.

### 2. Created `requirements.txt`
Created a `requirements.txt` file with all dependencies. Vercel's Python runtime looks for this file first.

```txt
fastapi>=0.68.0
uvicorn>=0.15.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=0.19.0
email-validator>=2.0.0
aiohttp>=3.9.0
```

## Next Steps

### 1. Commit and Push Changes
```bash
cd /Users/eduardoguruhotel/dev/tomin/backend
git add pyproject.toml requirements.txt
git commit -m "Add aiohttp dependency for Vercel deployment"
git push origin main
```

### 2. Redeploy to Vercel
Vercel will automatically redeploy when you push to your main branch. Or you can manually trigger a redeploy from the Vercel dashboard.

### 3. Set Environment Variables in Vercel
Make sure these environment variables are set in your Vercel project settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxx` |
| `REDIRECT_URI` | OAuth redirect URI | `https://your-api.vercel.app/api/v1/auth/callback` |
| `FRONTEND_URL` | Your frontend URL | `https://your-app.vercel.app` |

### 4. Update Google OAuth Settings
After deployment, update your Google Cloud Console OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Select your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs:**
   ```
   https://your-backend-api.vercel.app/api/v1/auth/callback
   ```
5. Add to **Authorized JavaScript origins:**
   ```
   https://your-backend-api.vercel.app
   https://your-frontend-app.vercel.app
   ```

## Verification

After deployment, test your endpoints:

```bash
# Health check
curl https://your-api.vercel.app/api/v1/health

# Auth endpoint
curl https://your-api.vercel.app/api/v1/auth/login
```

## Additional Notes

- The `vercel.json` configuration is correct
- Python version is set to 3.9
- Max Lambda size is 15mb (should be sufficient)
- All routes are properly configured to route to `src/index.py`

## Troubleshooting

If you still encounter issues:

1. **Check Vercel build logs** for specific error messages
2. **Verify all environment variables** are set correctly
3. **Check that CORS settings** allow your frontend domain
4. **Ensure Google OAuth credentials** are valid and redirect URIs match

## Common Vercel Deployment Issues

### Import Path Issues
If you see import errors, make sure your imports use the correct paths. The current setup uses:
- Absolute imports from `src/` directory
- The `sys.path` is correctly configured in `index.py`

### Cold Start Delays
Vercel serverless functions may have cold starts. The first request after inactivity might be slower.

### Lambda Size Limits
If your deployment exceeds 15mb, you may need to:
- Remove unused dependencies
- Increase `maxLambdaSize` in `vercel.json`
- Consider using Vercel's Edge Functions for lighter workloads
