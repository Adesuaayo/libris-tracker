# 🚀 Vercel Backend Setup - Visual Guide

## Step-by-Step Deployment

### Step 1: Go to Vercel.com

![Step 1](https://via.placeholder.com/600x300?text=1.+Go+to+Vercel.com)

Visit https://vercel.com and sign in with GitHub

---

### Step 2: Click "New Project"

Look for the **"New Project"** button in the top right, or on your dashboard.

```
┌─────────────────────────────────────────┐
│  Vercel Dashboard                       │
├─────────────────────────────────────────┤
│                                         │
│  [+ New Project]  [Settings]  [Help]   │
│                                         │
└─────────────────────────────────────────┘
```

---

### Step 3: Import Git Repository

Select **"Import Git Repository"** and search for `libris-tracker`

```
Select a Git Repository:
  
  🔍 Search your Git repositories...
  
  ✓ Adesuaayo/libris-tracker
  
  [Continue]
```

---

### Step 4: Configure Project

Vercel will auto-detect your project. Click **"Deploy"**

```
┌────────────────────────────────┐
│  Import Project                │
├────────────────────────────────┤
│                                │
│  Project Name: libris-tracker  │
│  Root Directory: ./            │
│  Framework: React (Vite)       │
│  Build Command: npm run build  │
│                                │
│  [Deploy]                      │
└────────────────────────────────┘
```

---

### Step 5: Add Environment Variables ⭐ IMPORTANT

Before the build completes, go to **Settings** → **Environment Variables**

Add these three:

```
NAME                          VALUE
─────────────────────────────────────────────────────────────
GEMINI_API_KEY               <YOUR_API_KEY_HERE>
VITE_SUPABASE_URL            https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY       <YOUR_ANON_KEY_HERE>
```

**IMPORTANT**: Set each to both **Production** and **Preview**

```
Environment Variable:
  Name: GEMINI_API_KEY
  Value: AIzaSy...
  
  ☑ Production  ☑ Preview
  
  [Save]
```

---

### Step 6: Deploy

Click **"Deploy"** button (or wait for auto-rebuild if you added env vars after initial deploy)

```
Building...
⏳ 2 minutes...

✅ Deployment successful!

Your URL: https://libris-tracker.vercel.app
```

---

## Verify Deployment Works

### Test 1: Health Check

Open this URL in your browser:
```
https://libris-tracker.vercel.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T...",
  "message": "Libris backend is running"
}
```

✅ **Backend is running!**

---

### Test 2: Full App Test

1. Open https://libris-tracker.vercel.app
2. Create an account (email/password)
3. Add at least 1 book
4. Click **"AI Assistant"** sidebar
5. Click **"Recommend Books"**

**Expected**: See 3 book recommendations ✅

---

### Test 3: Rate Limiting

1. Click **"Recommend Books"** 4 times rapidly
2. On the 4th click, you should get:

```
Error: Rate limited. Try again in 58s
```

✅ **Rate limiting is working!**

---

## Troubleshooting

### Issue: Health check shows 404

```json
{"error": "Cannot find module '@vercel/node'"}
```

**Solution:**
- Wait for Vercel to complete build
- Or redeploy: Push to GitHub again

---

### Issue: "GEMINI_API_KEY is missing"

```json
{"error": "Backend configuration error"}
```

**Solution:**
1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Add `GEMINI_API_KEY`
4. Redeploy

---

### Issue: "Rate limited" on first request

**This is normal!** Rate limiter is working. Wait 60 seconds.

---

### Issue: Still getting rate limited after 60 seconds?

This might be in-memory rate limiter bug. Redeploy:
```bash
git push origin master
```

Vercel will auto-rebuild and restart the rate limiter.

---

## After Deployment

### Rebuild APK (for your phone)

Since the backend URL changed, rebuild the APK:

```bash
npm run android:build
```

Or wait for GitHub Actions to automatically build on next push.

---

### Monitor Backend Health

**View logs in Vercel:**

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Deployments** tab
4. Find latest deployment
5. Click **Logs** to see:
   - All API calls
   - Errors
   - Rate limiting events

---

### Check Rate Limit Headers

Every API response includes rate limit info:

```
X-RateLimit-Remaining: 2
X-RateLimit-Reset-In: 52000
```

This tells the frontend how many calls are left and when the limit resets.

---

## Architecture After Deployment

```
┌──────────────────────────────────────────────────────┐
│  Your Users' Phones (APK)                            │
│                                                      │
│  No API keys embedded ✅                             │
└────────────────────┬─────────────────────────────────┘
                     │
                     │ HTTPS
                     ↓
┌──────────────────────────────────────────────────────┐
│  https://libris-tracker.vercel.app                   │
│                                                      │
│  Frontend (React)       Backend (Vercel Functions)   │
│  - Books UI            - Rate Limiting               │
│  - Analytics           - Auth Check                  │
│  - Dark Mode           - Gemini API Calls            │
│  - Settings            - Error Handling              │
└──────────────────────┬───────────────────────────────┘
                       │
                       │ (Only from Vercel to Google)
                       ↓
        ┌──────────────────────────┐
        │  Google Gemini API       │
        │  (API key on server!)    │
        └──────────────────────────┘
```

---

## Security Checklist

- [ ] API key is in Vercel Environment Variables (not in code)
- [ ] Health endpoint works: `/api/health` returns `{"status":"ok"}`
- [ ] Recommendations endpoint works: Can see book suggestions
- [ ] Rate limiting works: 4th request gets 429 error
- [ ] Frontend frontend (no errors in browser console)
- [ ] Can add books and sync to Supabase
- [ ] Dark mode still works
- [ ] All 3 AI features work (Recommend, Summary, Analyze)

---

## Next Steps

Once your backend is deployed and working:

1. ✅ **Backend Proxy** (DONE! 🎉)
2. **Image Storage** - Replace Base64 with Supabase Storage
3. **Error Boundaries** - Prevent white-screen crashes
4. **Toast Notifications** - Replace alert() popups
5. **Pagination** - Handle 500+ books

---

## Support

**Having issues?** Check:

1. `BACKEND_DEPLOYMENT.md` - Detailed guide
2. `BACKEND_IMPLEMENTATION_SUMMARY.md` - Technical details
3. Vercel logs: `vercel logs --prod` in terminal
4. GitHub Issues: Raise an issue in your repo

---

**Congratulations! Your backend is now secure and production-ready.** 🚀

Push to Vercel and get your API keys protected!
