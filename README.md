# Music Poster Generator Backend

Backend API for generating music posters from Spotify metadata using a multi-template poster system. (CHANGE)

## Project Overview

This service provides:

- Spotify search proxy endpoints for artists and tracks.
- Poster preview generation as raw HTML.
- Poster image rendering (PNG/JPG) using Playwright + Chromium.
- Cover image proxying for remote album artwork.
- A template registry so new poster layouts can be added in isolated modules.

The API is built with Node.js + Express and is designed to be deployed in Docker (Railway-friendly).

## Tech Stack

- Node.js
- Express
- Playwright
- Chromium
- Docker
- Railway (deployment target)

## Template Architecture

Poster templates are modular and registry-based:

```
templates/
  registry.js
  shared.js
  spotify-player-v1/
    index.js
  minimal-clean-v1/
    index.js
  minimal-reveal-v1/
    index.js
```

- `templates/registry.js` exposes available templates and metadata.
- Each template module exports:
  - `id`
  - `displayName`
  - `description`
  - `defaultTheme`
  - `normalizePayload(payload)`
  - `renderHtml(normalizedPayload)`
- `poster-service.js` is the shared flow for:
  - template resolution
  - payload normalization
  - HTML generation
- `poster-renderer.js` only renders HTML to image via Playwright.

### Shared Preview/Render Path

Both preview and final export use the same exact service path (`buildPoster`), so exported image output stays aligned with the HTML preview.

## API Endpoints

Base URL (local): `http://localhost:3001`

### Health

- `GET /api/health`
- Returns service status.

### Template Discovery

- `GET /api/templates`
- Returns available templates:

```json
[
  {
    "id": "spotify-player-v1",
    "name": "Spotify Player",
    "description": "Original player-style poster"
  },
  {
    "id": "minimal-clean-v1",
    "name": "Minimal Clean",
    "description": "Minimal alternative poster"
  },
  {
    "id": "minimal-reveal-v1",
    "name": "Minimal Reveal",
    "description": "Minimal poster base frame for text reveal video rendering"
  }
]
```

### Spotify Search

- `GET /api/artists?q=<query>&limit=<n>`
  - Search artists and return normalized artist objects.
- `GET /api/tracks?q=<query>&artistName=<name>&limit=<n>`
  - Search tracks (optionally scoped by artist name) and return normalized track objects.

### Poster Generation

- `POST /api/posters/preview`
  - Input: poster payload JSON.
  - Output: normalized model + rendered HTML.
- `POST /api/posters/render`
  - Input: poster payload JSON.
  - Output: rendered image binary (`image/png` or `image/jpeg`) for standard templates, or `video/mp4` for `minimal-reveal-v1`.

### Cover Proxy

- `GET /api/cover?url=<http-or-https-image-url>`
- Fetches remote image and returns image bytes with cache headers.

## Poster Payload Model

Common normalized fields supported across templates:

- `template`
- `theme`
- `track.title`
- `track.artists`
- `track.currentTime`
- `track.totalTime`
- `artwork.coverUrl`
- `output.width`
- `output.format`
- `output.quality`

Optional metadata fields currently accepted:

- `track.album`
- `track.year`
- `track.spotifyUrl`
- `artwork.accentColor`

### Defaults / Backward Compatibility

- If `template` is omitted, backend defaults to `spotify-player-v1`.
- Existing `spotify-player-v1` requests remain supported.
- Unknown template IDs return HTTP 400.

## Example Requests

### 1) Preview with default (spotify-player-v1)

```http
POST /api/posters/preview
Content-Type: application/json

{
  "track": {
    "title": "Conspiraciones",
    "artists": "Rauw Alejandro",
    "currentTime": "1:20",
    "totalTime": "3:44"
  },
  "artwork": {
    "coverUrl": "https://i.scdn.co/image/ab67616d0000b273..."
  },
  "output": {
    "width": 1000,
    "format": "jpeg",
    "quality": 0.92
  }
}
```

### 2) Preview with minimal-clean-v1

```http
POST /api/posters/preview
Content-Type: application/json

{
  "template": "minimal-clean-v1",
  "theme": "inverse",
  "track": {
    "title": "Monaco",
    "artists": "Bad Bunny",
    "album": "nadie sabe lo que va a pasar mañana",
    "year": "2023",
    "currentTime": "0:58",
    "totalTime": "4:27"
  },
  "artwork": {
    "coverUrl": "https://i.scdn.co/image/ab67616d0000b273..."
  },
  "output": {
    "width": 1200,
    "format": "png"
  }
}
```

### 3) Render for either template

```http
POST /api/posters/render
Content-Type: application/json

{
  "template": "spotify-player-v1",
  "track": {
    "title": "Conspiraciones",
    "artists": "Rauw Alejandro",
    "currentTime": "1:20",
    "totalTime": "3:44"
  },
  "artwork": {
    "coverUrl": "https://i.scdn.co/image/ab67616d0000b273..."
  },
  "output": {
    "width": 1000,
    "format": "jpeg",
    "quality": 0.9
  }
}
```

## Adding a New Template

1. Create a new folder under `templates/`, e.g. `templates/my-template-v1/index.js`.
2. Export required fields (`id`, `displayName`, `description`, `normalizePayload`, `renderHtml`).
3. Reuse helpers from `templates/shared.js` where possible.
4. Register it in `templates/registry.js`.
5. Verify:
   - `GET /api/templates` includes it.
   - `POST /api/posters/preview` returns expected HTML/model.
   - `POST /api/posters/render` exports image with same visual output as preview.

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
VIDEO_MICROSERVICE_URL=http://localhost:3002
```

Notes:

- `FRONTEND_ORIGINS` accepts comma-separated origins for CORS allowlisting.
- `FRONTEND_ORIGIN` is also supported as a fallback.
- `VIDEO_MICROSERVICE_URL` configures where `minimal-reveal-v1` delegates MP4 rendering (`POST /render`).

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
