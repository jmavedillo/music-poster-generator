# music-poster-generator

Music poster generator with:

- **Backend API** (`server.js`) for Spotify search, preview HTML, and image export.
- **Next.js frontend** (`music-poster-landing`) for searching tracks and generating posters.

## Local setup

### 1) Install backend dependencies

```bash
npm install
```

### 2) Install frontend dependencies

```bash
cd music-poster-landing
npm install
```

### 3) Configure environment variables

Create a `.env` file in the repo root:

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
FRONTEND_ORIGINS=http://localhost:3000
PORT=3001
```

Create `music-poster-landing/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 4) Run both apps

Backend (repo root):

```bash
npm start
```

Frontend (`music-poster-landing`):

```bash
npm run dev
```

## Rendering dependencies

Poster export (`/api/posters/render`) uses **Playwright Chromium**.

Install Playwright as a runtime dependency and then install Chromium browser binaries:

```bash
npm install playwright
npm run playwright:install
```

(And on minimal Linux servers you may also need: `npx playwright install-deps chromium`.)

## Troubleshooting: "Unable to render preview right now"

Preview calls `/api/posters/preview` and does **not** require Chromium. When preview fails, it usually means:

- Backend API is not running.
- `NEXT_PUBLIC_API_BASE_URL` points to the wrong host.
- CORS is blocking your frontend origin.

Check:

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{"ok":true,"service":"spotify-api-proxy"}
```
