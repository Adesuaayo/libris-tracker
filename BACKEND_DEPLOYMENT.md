# Libris Backend Deployment Guide

## Overview

Your Libris app now has a **serverless backend powered by Vercel Functions**. This means:

✅ **API keys are kept secret** (no longer exposed in frontend)  
✅ **Rate limiting is enforced** (3 calls/minute per user)  
✅ **Gemini costs are controlled** (backend proxy prevents direct exposure)  
✅ **Auto-scaling** (Vercel handles traffic automatically)  

---

## Step 1: Prepare Your Repository

### 1.1 Update `.gitignore`

Make sure `.env.local` is ignored (it already should be):

```bash
# .gitignore
node_modules
dist
dist-ssr
*.local
.env.local
```

### 1.2 Commit Backend Files

```bash
git add .
git commit -m "feat: add Vercel backend with rate-limited Gemini API proxy"
git push origin master
```

---

## Step 2: Deploy to Vercel

### 2.1 Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"** → **"Import Git Repository"**
3. Select your **libris-tracker** repo
4. Click **"Import"**

### 2.2 Configure Environment Variables

In the Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following secrets:

| Name | Value | Notes |
|------|-------|-------|
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API key |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase Settings |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase Settings |

3. Make sure each is set to `Production` and `Preview`

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~2-3 minutes)
3. You'll get a URL like: `https://libris-tracker.vercel.app`

---

## Step 3: Update GitHub Secrets (for Android APK builds)

Your GitHub Actions workflow also needs these secrets for building APKs:

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add/update:
   - `GEMINI_API_KEY` (same as Vercel)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Step 4: Test the Backend

### 4.1 Test Locally (Dev Server)

```bash
npm install
npm start
```

The frontend will try to call `http://localhost:3000/api/gemini-recommendations`. Since your backend isn't running locally, you'll get an error, but the setup is correct. Production will use the Vercel URL.

### 4.2 Test on Production

After deploying to Vercel:

1. Open your Vercel URL in a browser (e.g., `https://libris-tracker.vercel.app`)
2. Create an account
3. Add a few books
4. Click **"Recommend Books"** (in the AI Assistant sidebar)
5. You should see recommendations from Gemini ✅

### 4.3 Test Rate Limiting

Click "Recommend Books" 4 times rapidly. On the 4th attempt, you should get a rate limit error:

```
Error: Rate limited. Try again in 58s
```

This proves the backend is working! 🎉

---

## Step 5: Update Your APK Builds

Your GitHub Actions workflow will now use the backend. When you push to `master`:

1. GitHub Actions runs
2. Frontend is built (no API keys embedded)
3. APK is generated
4. When users open the APK, it calls your backend at `https://libris-tracker.vercel.app/api/gemini-*`

---

## How It Works

### Before (Insecure)
```
User's Phone → [Calls Gemini directly] → Google Gemini API
↓ (API key embedded in APK)
Anyone who decompiles = access to your API key 😱
```

### After (Secure)
```
User's Phone → [Calls your backend] → Vercel → [Backend calls Gemini] → Google Gemini API
↓                                          ↓
(No API key)                          (API key hidden)
```

---

## Rate Limiting Details

Currently: **3 API calls per minute per user**

Limits are enforced on these endpoints:
- `/api/gemini-recommendations`
- `/api/gemini-summary`
- `/api/gemini-analyze`

To change the limit, edit `api/rate-limiter.ts`:

```typescript
const MAX_CALLS = 3; // Change this number
const WINDOW_MS = 60 * 1000; // Change this to 60s, 300s, etc.
```

---

## Monitoring & Debugging

### View Vercel Logs

```bash
vercel logs --prod
```

Or use the Vercel dashboard: **Deployments** → **Functions** → **Logs**

### Common Issues

| Issue | Solution |
|-------|----------|
| "Backend configuration error" | Check that `GEMINI_API_KEY` is set in Vercel Environment Variables |
| "Rate limited" | Wait 60 seconds before calling AI again |
| "401 User not authenticated" | Make sure you're logged into the app |
| 404 errors | Verify the Vercel URL is correct (should auto-detect from `window.location.origin`) |

---

## Next Steps

1. ✅ Commit and push all changes
2. ✅ Deploy to Vercel
3. ✅ Test on your phone (APK will auto-update when rebuilt)
4. ✅ Move on to other features (image storage, error boundaries, etc.)

---

## Questions?

If your backend isn't working:

1. Check Vercel logs: `vercel logs --prod`
2. Make sure environment variables are set in Vercel dashboard
3. Verify that `api/*.ts` files are in your repo
4. Try redeploying: push to GitHub and wait for Vercel to rebuild

Good luck! 🚀
