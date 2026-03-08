# Music Poster Generator Backend

Backend API for a SaaS that generates music posters from Spotify metadata and poster payloads.

## Project Overview

This service provides:

- Spotify search proxy endpoints for artists and tracks.
- Poster preview generation as raw HTML.
- Poster image rendering (PNG/JPG) using Playwright + Chromium.
- Cover image proxying for remote album artwork.

The API is built with Node.js + Express and is designed to be deployed in Docker (Railway-friendly).

## Tech Stack

- Node.js
- Express
- Playwright
- Chromium
- Docker
- Railway (deployment target)

## Architecture

High-level request flow:

1. Frontend calls backend REST endpoints.
2. Backend handles CORS and validates request payload/query params.
3. For search endpoints, backend fetches Spotify OAuth token (cached in-memory) and queries Spotify Web API.
4. For preview endpoint, backend renders poster HTML from normalized payload.
5. For render endpoint, backend uses Playwright Chromium to render poster HTML to an image buffer.
6. Backend returns JSON responses or image binaries.

Core files:

- `server.js`: Express server, API routes, Spotify proxy logic, CORS.
- `poster-template.js`: poster payload normalization + HTML template rendering.
- `poster-renderer.js`: Playwright-based poster image renderer.
- `Dockerfile`: production container setup.

## API Endpoints

Base URL (local): `http://localhost:3001`

### Health

- `GET /api/health`
- Returns service status.

### Spotify Search

- `GET /api/artists?q=<query>&limit=<n>`
  - Search artists and return normalized artist objects.
- `GET /api/tracks?q=<query>&artistName=<name>&limit=<n>`
  - Search tracks (optionally scoped by artist name) and return normalized track objects.

### Poster Generation

- `POST /api/posters/preview`
  - Input: poster payload JSON.
  - Output: normalized model + rendered HTML (JSON response).
- `POST /api/posters/render`
  - Input: poster payload JSON.
  - Output: rendered image binary (`image/png` or `image/jpeg`).

### Cover Proxy

- `GET /api/cover?url=<http-or-https-image-url>`
- Fetches remote image and returns image bytes with cache headers.

## Local Development

### Prerequisites

- Node.js 18+
- npm

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env` in repo root:

```bash
PORT=3001
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
FRONTEND_ORIGINS=http://localhost:3000
```

Notes:

- `FRONTEND_ORIGINS` accepts comma-separated origins for CORS allowlisting.
- `FRONTEND_ORIGIN` is also supported as a fallback.

### 3) Run the API

```bash
npm start
```

### 4) Quick health check

```bash
curl http://localhost:3001/api/health
```

Expected:

```json
{"ok":true,"service":"spotify-api-proxy"}
```

## Docker Deployment

Build image:

```bash
docker build -t music-poster-generator .
```

Run container:

```bash
docker run --rm -p 3001:3001 \
  -e PORT=3001 \
  -e SPOTIFY_CLIENT_ID=your_spotify_client_id \
  -e SPOTIFY_CLIENT_SECRET=your_spotify_client_secret \
  -e FRONTEND_ORIGINS=https://your-frontend-domain.com \
  music-poster-generator
```

## Railway Deployment Notes

When deploying on Railway:

- Use the provided `Dockerfile`.
- Set all required environment variables in Railway project settings.
- Set `FRONTEND_ORIGINS` to your production frontend domain(s).
- Railway injects `PORT`; keep server binding to `process.env.PORT`.

## Frontend Integration

Frontend should treat this service as its API base URL.

Typical integration:

- Set frontend env var (example): `NEXT_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app`
- Call backend endpoints from browser/server components.
- Ensure frontend origin is included in backend `FRONTEND_ORIGINS` to avoid CORS rejection.

Example calls:

```http
GET {API_BASE_URL}/api/tracks?q=Despecha&limit=10
POST {API_BASE_URL}/api/posters/preview
POST {API_BASE_URL}/api/posters/render
```
