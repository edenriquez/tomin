# Deploying Tomin Frontend to Vercel

This guide will walk you through deploying your Next.js frontend to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier is fine)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Vercel CLI installed (optional, but recommended)

## Method 1: Deploy via Vercel Dashboard (Recommended for First Time)

### Step 1: Push Your Code to Git

If you haven't already, push your code to GitHub:

```bash
cd /Users/eduardoguruhotel/dev/tomin
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository:
   - Select your Git provider (GitHub/GitLab/Bitbucket)
   - Find and select your `tomin` repository
   - Click **"Import"**

### Step 3: Configure Project Settings

Vercel will auto-detect that this is a Next.js project. Configure the following:

**Framework Preset:** Next.js (should be auto-detected)

**Root Directory:** `frontend` (⚠️ IMPORTANT - since your Next.js app is in the frontend folder)

**Build Command:** `npm run build` (default)

**Output Directory:** `.next` (default)

**Install Command:** `npm install` (default)

### Step 4: Set Environment Variables

Click on **"Environment Variables"** and add:

| Name | Value | Description |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-api.com/api/v1` | Your backend API URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `your-google-client-id` | Google OAuth Client ID |

⚠️ **Important:** 
- Replace `https://your-backend-api.com/api/v1` with your actual backend URL
- Get your Google Client ID from [Google Cloud Console](https://console.cloud.google.com/)
- Make sure to add your Vercel domain to Google OAuth allowed redirect URIs

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 1-2 minutes)
3. Once deployed, you'll get a URL like `https://tomin-xxx.vercel.app`

---

## Method 2: Deploy via Vercel CLI (Faster for Subsequent Deploys)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy from Frontend Directory

```bash
cd /Users/eduardoguruhotel/dev/tomin/frontend
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Select your account
- **Link to existing project?** No (first time) or Yes (subsequent deploys)
- **What's your project's name?** tomin-frontend
- **In which directory is your code located?** ./ (current directory)

### Step 4: Add Environment Variables via CLI

```bash
vercel env add NEXT_PUBLIC_API_URL
# Enter your backend API URL when prompted

vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
# Enter your Google Client ID when prompted
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

---

## Post-Deployment Configuration

### 1. Update Google OAuth Settings

Add your Vercel domain to Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Select your OAuth 2.0 Client ID
4. Add to **Authorized JavaScript origins:**
   ```
   https://your-app.vercel.app
   ```
5. Add to **Authorized redirect URIs:**
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

### 2. Update Backend CORS Settings

Make sure your backend allows requests from your Vercel domain:

```python
# In your backend CORS configuration
ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",
    "http://localhost:3000",  # for local development
]
```

### 3. Set Up Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Update your DNS records as instructed by Vercel

---

## Continuous Deployment

Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every push to other branches or pull requests

You can configure this in **Settings** → **Git** in your Vercel dashboard.

---

## Troubleshooting

### Build Fails

**Check build logs** in Vercel dashboard for specific errors.

Common issues:
- Missing environment variables
- TypeScript errors
- Missing dependencies

### Environment Variables Not Working

- Make sure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new environment variables
- Check that variables are set for the correct environment (Production/Preview/Development)

### 404 Errors on Routes

- Ensure your `next.config.ts` doesn't have conflicting settings
- Check that all pages are in the correct `src/app` directory structure

### Google OAuth Not Working

- Verify redirect URIs in Google Cloud Console
- Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
- Ensure your Vercel domain is added to authorized origins

---

## Useful Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List all deployments
vercel ls

# Remove a deployment
vercel remove [deployment-url]

# Open project in browser
vercel open
```

---

## Environment Variables Reference

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

⚠️ **Never commit `.env.local` to Git!** (It's already in `.gitignore`)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

## Quick Deploy Checklist

- [ ] Code pushed to Git repository
- [ ] Project imported to Vercel
- [ ] Root directory set to `frontend`
- [ ] Environment variables configured
- [ ] Google OAuth redirect URIs updated
- [ ] Backend CORS settings updated
- [ ] Deployment successful
- [ ] Test authentication flow
- [ ] Test dashboard functionality
