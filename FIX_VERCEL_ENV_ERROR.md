# ✅ Fix for Vercel Environment Variable Error

## The Problem

You saw this error in Vercel:
```
Environment Variable "GEMINI_API_KEY" references Secret "GEMINI_API_KEY", which does not exist.
```

## The Solution

The `vercel.json` was incorrectly trying to **reference** secrets with `@` syntax. This is not needed for our backend!

**I've fixed `vercel.json`** to remove the `env` section entirely. Environment variables should be added directly in Vercel's UI instead.

---

## 🔧 What to Do NOW (In Vercel Dashboard)

### Step 1: Go to Vercel Dashboard

1. Open https://vercel.com
2. Select your **libris-tracker** project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Three Environment Variables

Add these **directly** (NOT as references):

#### Variable 1: GEMINI_API_KEY
```
Name:  GEMINI_API_KEY
Value: AIzaSyAJNLoBBYbDjwLJBpNm2Fuf_UYjA0oUFLs
Environments: ☑ Production  ☑ Preview
```

#### Variable 2: VITE_SUPABASE_URL
```
Name:  VITE_SUPABASE_URL
Value: https://rdxbmifcclfbdfgvnikg.supabase.co
Environments: ☑ Production  ☑ Preview
```

#### Variable 3: VITE_SUPABASE_ANON_KEY
```
Name:  VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGJtaWZjY2xmYmRmZ3ZuaWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjQ3MDQsImV4cCI6MjA4MDEwMDcwNH0.rQAepf1hrLatGlRHxstsQCd4ZHXWqxqxnFHS35Sxmd4
Environments: ☑ Production  ☑ Preview
```

**⚠️ IMPORTANT**: For each variable, make sure BOTH "Production" and "Preview" are checked.

### Step 3: Save and Redeploy

1. After adding all three variables, click **Save**
2. Go to **Deployments** tab
3. Find your latest deployment
4. Click **Redeploy** button

Vercel will rebuild with the environment variables. Wait 2-3 minutes.

### Step 4: Verify

Check that the error is gone:
- No more "references Secret" errors
- Deployment shows "Ready"
- Click on deployment to see logs

---

## 📝 What Changed

### Before (Broken)
```json
{
  "env": {
    "GEMINI_API_KEY": "@GEMINI_API_KEY",
    "VITE_SUPABASE_URL": "@VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY": "@VITE_SUPABASE_ANON_KEY"
  }
}
```

❌ This tries to reference secrets that don't exist

### After (Fixed)
```json
{}
```

✅ Environment variables are now added directly in Vercel UI (no references needed)

---

## 🔐 Where Secrets Go

**Vercel Dashboard** → Settings → Environment Variables
(Not in `vercel.json`)

This is the standard way to manage environment variables on Vercel.

---

## 🧪 Test After Redeployment

1. Visit your Vercel URL: `https://libris-tracker.vercel.app/api/health`
2. You should see:
   ```json
   {"status":"ok","timestamp":"...","message":"Libris backend is running"}
   ```

3. If you see this → ✅ Backend is working!

---

## ❓ FAQ

**Q: Do I need to update vercel.json again?**
A: No, I already fixed it. Just push the changes.

**Q: Why can't I use @GEMINI_API_KEY syntax?**
A: That syntax only works with Vercel Edge Config/KV Store. For simple env vars, use the UI.

**Q: Will this work for both web and APK?**
A: Yes! The backend is hosted on Vercel, so both use the same API.

**Q: What if I need to change the API key later?**
A: Edit it in Vercel Dashboard → Settings → Environment Variables → Update value → Auto-redeploy

---

## 📋 Checklist

- [ ] Go to Vercel Dashboard
- [ ] Go to Settings → Environment Variables
- [ ] Add GEMINI_API_KEY (check Production + Preview)
- [ ] Add VITE_SUPABASE_URL (check Production + Preview)
- [ ] Add VITE_SUPABASE_ANON_KEY (check Production + Preview)
- [ ] Click Save
- [ ] Go to Deployments → Redeploy latest
- [ ] Wait 2-3 minutes for build
- [ ] Visit /api/health to verify ✅

---

**After this, the error will be gone and your backend will work!** 🎉
