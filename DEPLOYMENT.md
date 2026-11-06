# Voice Khata Lite — 🚀 Free Cloud Deployment Guide

This guide explains how to deploy **Voice Khata Lite** to the cloud for **100% free** with **HTTPS** enabled (HTTPS is strictly required by mobile browsers for microphone permissions).

---

## 🌟 Method 1: Render.com (Recommended — Full-Stack Single Service)

Deploying both the **React Frontend** and **Python Flask Backend** together on Render is the fastest, cleanest, and zero-CORS method.

### Step 1: Push Code to GitHub

1. Open [github.com](https://github.com) and create a **New Repository** named `voice-khata-lite` (Public or Private).
2. Run these commands in your project folder (`C:\Users\ASUS\.gemini\antigravity\scratch\voice-khata-lite`):
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/voice-khata-lite.git
   git push -u origin main
   ```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and Sign In using your **GitHub account**.
2. Click **New +** (top right) and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your `voice-khata-lite` repository.
4. Fill in the following settings:

| Setting | Value |
|---|---|
| **Name** | `voice-khata-lite` (or any unique name) |
| **Region** | `Singapore` (closest to India for lowest latency) |
| **Branch** | `main` |
| **Language / Environment** | `Python 3` |
| **Build Command** | `npm --prefix frontend install && npm --prefix frontend run build && pip install -r backend/requirements.txt && python backend/seed.py` |
| **Start Command** | `cd backend && gunicorn app:app` |
| **Instance Type** | `Free` ($0/month) |

5. Under **Environment Variables**, add:
   - `SHOP_NAME`: `Sharma General Store`
   - `SHOP_UPI_ID`: `sharma@upi`
   - `PYTHON_VERSION`: `3.11.9`

6. Click **Deploy Web Service**!

Render will automatically install Node dependencies, compile the React Vite bundle, install Python packages, seed the database, and launch Gunicorn. In 2-3 minutes, you will get your live URL:
```text
https://voice-khata-lite.onrender.com
```

---

## ⚡ Method 2: Vercel (Frontend) + Render (Backend)

If you prefer hosting the React frontend on Vercel:

### Step 1: Deploy Backend on Render
1. Follow Step 2 from Method 1, but set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt && python seed.py`
   - **Start Command**: `gunicorn app:app`
2. Copy your backend URL (e.g. `https://voice-khata-backend.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) and import `voice-khata-lite`.
2. Set **Root Directory** to `frontend`.
3. Add Environment Variable:
   - `VITE_API_URL`: `https://voice-khata-backend.onrender.com`
4. Click **Deploy**.

---

## 📱 Mobile Microphone Permission (HTTPS)

- **Why HTTPS?**: The browser's **Web Speech API** (`webkitSpeechRecognition`) blocks microphone access on unencrypted `http://` sites (except `localhost`).
- Both Render and Vercel automatically generate a **free SSL/TLS Certificate (HTTPS)**, so your mobile phone mic will work immediately!
