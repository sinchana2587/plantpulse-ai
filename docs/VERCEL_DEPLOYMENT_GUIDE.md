# PlantPulse AI — Vercel & Production Deployment Guide

This guide walks you through deploying **PlantPulse AI** with:
- **Frontend (React 19 + Vite + Tailwind CSS)** deployed on **Vercel** (Global Edge CDN, automatic HTTPS, continuous deployment).
- **Backend (FastAPI + OpenCV + ML)** deployed on **Render / Railway / Fly.io** (dedicated Python service with persistent disk and ML support).

---

## Architecture Overview

```
 ┌───────────────────────────┐         ┌───────────────────────────┐
 │       VERCEL EDGE         │         │     RENDER / RAILWAY      │
 │   React 19 + Vite + SPA   │ ──────> │      FastAPI Backend      │
 │  (plantpulse-ai.vercel.app│  HTTPS  │ (plantpulse-api.onrender) │
 └───────────────────────────┘  CORS   └─────────────┬─────────────┘
                                                     │
                                       ┌─────────────┴─────────────┐
                                       │ SQLite / Postgres + Disks │
                                       │ Scikit-Learn & OpenCV ML  │
                                       └───────────────────────────┘
```

> **Why split Frontend and Backend?**
> Vercel's Python runtime runs in serverless functions (AWS Lambda). Serverless functions have an ephemeral, read-only filesystem (which would wipe your SQLite database and image uploads on every cold restart) and have strict 250 MB uncompressed limits that conflict with heavy ML/vision packages (`opencv-python-headless`, `scikit-learn`, `numpy`).
> Running the React frontend on **Vercel** and the FastAPI service on **Render / Railway** gives you the best performance, zero data loss, and free-tier hosting for both.

---

## Option 1: Deploying the Frontend on Vercel (via GitHub - Recommended)

### Step 1: Push the Code to GitHub
If you haven't initialized a repository yet:
```bash
git init
git add .
git commit -m "feat: prepare PlantPulse AI for Vercel deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select your GitHub repository.
3. In the **Configure Project** screen:
   - **Framework Preset**: `Vite` (automatically detected).
   - **Root Directory**: Click `Edit` and select `plantpulse-ai/frontend` (or `frontend` if your repository root is `plantpulse-ai`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   ```env
   VITE_API_BASE_URL=https://<your-backend-service-url>
   ```
   *(If your backend is not yet deployed, you can leave it blank initially or update it after deploying the backend).*
5. Click **Deploy**. Vercel will build and assign you a live `https://<project-name>.vercel.app` URL.

---

## Option 2: Deploying via Vercel CLI

Vercel CLI is already installed on your machine!

1. Open PowerShell and authenticate with Vercel:
   ```powershell
   vercel login
   ```
2. Navigate to the frontend directory:
   ```powershell
   cd "plantpulse-ai\frontend"
   ```
3. Run the deployment command:
   ```powershell
   vercel
   ```
   - *Set up and deploy?* `Y`
   - *Which scope?* Select your personal account.
   - *Link to existing project?* `N`
   - *Project name?* `plantpulse-ai` (or press Enter).
   - *In which directory is your code located?* `./`
   - *Want to modify settings?* `N`
4. Deploy to production:
   ```powershell
   vercel --prod
   ```

---

## Option 3: Deploying the Backend Service (Render / Railway)

### Method A: Deploy on Render (Free & 1-Click)
1. Sign in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following parameters:
   - **Name**: `plantpulse-backend`
   - **Language**: `Python 3`
   - **Root Directory**: `plantpulse-ai/backend` (or `backend`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   ```env
   ENVIRONMENT=production
   SECRET_KEY=generate_a_secure_random_string_here
   BACKEND_CORS_ORIGINS=["https://*.vercel.app","http://localhost:5173"]
   ```
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g. `https://plantpulse-backend.onrender.com`).
8. Add this URL to your Vercel project's **Environment Variables** as `VITE_API_BASE_URL`.

### Method B: Deploy using Dockerfile
The repository includes a production-ready `backend/Dockerfile`. You can deploy this directly to **Railway**, **Fly.io**, or **Render Docker Service**:
```bash
docker build -t plantpulse-backend backend/
docker run -p 8000:8000 plantpulse-backend
```

---

## CORS & Security Configuration

The FastAPI backend is pre-configured with:
```python
allow_origin_regex=r"https://.*\.vercel\.app"
```
This automatically allows all Vercel preview branch deployments and production URLs without CORS blockage.

If you attach a custom domain to Vercel (e.g., `https://plantpulse.yourdomain.com`), simply add it to `BACKEND_CORS_ORIGINS` in your backend environment variables:
```env
BACKEND_CORS_ORIGINS=["https://plantpulse.yourdomain.com","https://*.vercel.app"]
```

---

## Verification Checklist

1. **Frontend Load**: Visit your Vercel URL `https://<your-project>.vercel.app`. The landing view and login screen should render smoothly.
2. **SPA Routing**: Navigate to `/treatment` or refresh any inner view; verify it does not return a 404 error (handled by `vercel.json` rewrites).
3. **Backend Health Check**: Open browser devtools console and run:
   ```javascript
   await fetch('https://<your-backend-url>/health').then(r => r.json());
   // Should return: { status: "online", service: "PlantPulse AI", ... }
   ```
4. **End-to-End Test**: Register a test user or click **Demo Mode**, add a plant observation with an image, and verify phenology stage prediction.
