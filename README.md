
# Libris - Book Tracking App with AI

A full-stack book tracking application built with **React**, **TypeScript**, **Vite**, **Capacitor** (for Android), and **Gemini AI**.

## Features

- 📚 **Track your reading**: Add books, set reading goals, mark status (To Read, In Progress, Completed)
- 📊 **Analytics Dashboard**: View charts for genre distribution, monthly progress, completion rates
- 🤖 **AI-Powered**:
  - Get personalized book recommendations based on your reading history
  - Generate summaries for any book
  - Analyze your reading habits and get insights
- 🔐 **Secure**: Backend API proxy keeps your Gemini key safe
- ☁️ **Cloud Sync**: All data synced to Supabase (works across devices)
- 📱 **Cross-Platform**: Web (React), Android (Capacitor), with PWA support
- 🎨 **Beautiful UI**: Dark mode, responsive design, smooth animations

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Vercel Functions (serverless)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (Email/Password)
- **AI**: Google Gemini 2.5 Flash API
- **Mobile**: Capacitor 6.0 (Android bridge)
- **Charts**: Recharts

## Development

### Prerequisites
- Node.js 18+ (with npm)
- Supabase account (free tier)
- Google Gemini API key
- Vercel account (for backend deployment)

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/Adesuaayo/libris-tracker.git
cd libris-tracker

# 2. Install dependencies
npm install

# 3. Create .env.local with your credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key

# 4. Run dev server
npm start
```

Visit `http://localhost:5173` in your browser.

### Backend Deployment

The backend is hosted on Vercel Functions. All Gemini API calls go through your backend (API key is never exposed to users).

**See [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) for setup instructions.**

### Build for Android

```bash
# 1. Initialize Android project (first time only)
npm run android:init

# 2. Build APK
npm run android:build

# 3. APK will be in: android/app/build/outputs/apk/debug/app-debug.apk
```

## Deployment

### Frontend + Backend
Deploy to **Vercel** (handles both React frontend and API functions):

1. Connect your GitHub repo to Vercel
2. Add environment variables: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Deploy!

### Android APK
Built automatically by GitHub Actions on push to `master`:

- CI/CD workflow: `.github/workflows/build-android.yml`
- APK artifacts available for download

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LIBRIS APP                              │
├─────────────────────────────────────────────────────────────────┤
│ Frontend (React + TypeScript)                                   │
│   ├─ Web: http://localhost:5173                                 │
│   ├─ Android: Capacitor Bridge                                  │
│   └─ PWA: Install on home screen                                │
├─────────────────────────────────────────────────────────────────┤
│ Backend (Vercel Functions)                                      │
│   ├─ /api/gemini-recommendations   (Rate Limited)               │
│   ├─ /api/gemini-summary            (Rate Limited)              │
│   ├─ /api/gemini-analyze            (Rate Limited)              │
│   └─ /api/health                    (Status Check)              │
├─────────────────────────────────────────────────────────────────┤
│ External Services                                               │
│   ├─ Supabase (Auth + Database)                                 │
│   ├─ Google Gemini API (AI)                                     │
│   └─ GitHub Actions (CI/CD)                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Security

✅ **API keys protected**: Gemini key stored on server, never in frontend  
✅ **Rate limiting**: 3 API calls per minute per user  
✅ **User authentication**: Supabase Auth with secure sessions  
✅ **HTTPS only**: All communication encrypted  
✅ **No tracking**: Only stores your reading data  

## Roadmap

- [x] Core book tracking
- [x] AI recommendations & summaries
- [x] Cloud sync (Supabase)
- [x] Android app (Capacitor)
- [x] Backend proxy (Vercel Functions)
- [ ] Image storage optimization (Supabase Storage)
- [ ] Offline mode (PWA)
- [ ] Error boundaries & toast notifications
- [ ] Pagination for large libraries
- [ ] Social features (share lists, reviews)
- [ ] Web deployment

## License

MIT - Feel free to use, modify, and distribute!

## Contributing

Found a bug? Have an idea? Open an issue or PR!

---

**Made with ❤️ by the Libris team**
