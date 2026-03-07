const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { normalizePosterPayload, renderPosterHtml } = require('./poster-template');

let posterRenderer = null;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

app.use(express.json({ limit: '1mb' }));

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8000', 'http://localhost:3000'];
const FRONTEND_ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = FRONTEND_ALLOWED_ORIGINS.length
  ? FRONTEND_ALLOWED_ORIGINS
  : DEFAULT_ALLOWED_ORIGINS;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('/api/posters/preview', cors(corsOptions));
app.options('/api/posters/render', cors(corsOptions));

app.use((error, _req, res, next) => {
  if (error?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: error.message });
  }

  return next(error);
});

async function getPosterRenderer() {
  if (posterRenderer) return posterRenderer;
  posterRenderer = require('./poster-renderer');
  return posterRenderer;
}

let accessToken = null;
let tokenExpiresAt = 0;

async function getSpotifyAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify credentials in environment variables.');
  }

  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return accessToken;
}

async function searchSpotify({ q, type, limit = '10' }) {
  const token = await getSpotifyAccessToken();
  const params = new URLSearchParams({
    q: String(q),
    type: String(type),
    limit: String(limit),
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

function mapArtist(artist) {
  return {
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url || null,
  };
}

function mapTrack(track) {
  return {
    id: track.id,
    title: track.name,
    artists: (track.artists || []).map((artist) => ({
      id: artist.id,
      name: artist.name,
    })),
    durationSeconds: Math.round((track.duration_ms || 0) / 1000),
    coverUrl: track.album?.images?.[0]?.url || null,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'spotify-api-proxy' });
});

app.post('/api/posters/preview', (req, res) => {
  try {
    const payload = normalizePosterPayload(req.body || {});
    const html = renderPosterHtml(payload);
    return res.json({
      template: payload.template,
      html,
      model: payload,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Failed to render preview',
      code: 'POSTER_PREVIEW_FAILED',
      details: {
        template: req.body?.template || 'spotify-player-v1',
      },
    });
  }
});

app.post('/api/posters/render', async (req, res) => {
  try {
    const payload = normalizePosterPayload(req.body || {});
    const renderer = await getPosterRenderer();
    const { buffer, format, width, height } = await renderer.renderPosterImage(payload);
    res.setHeader('Content-Type', format === 'png' ? 'image/png' : 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="poster-${width}x${height}.${format === 'png' ? 'png' : 'jpg'}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Failed to render poster',
      code: 'POSTER_RENDER_FAILED',
    });
  }
});

app.get('/api/artists', async (req, res) => {
  const { q, limit = '10' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing required query parameter: q' });
  }

  try {
    const response = await searchSpotify({ q, type: 'artist', limit });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const artists = (data.artists?.items || []).map(mapArtist);

    return res.json(artists);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/tracks', async (req, res) => {
  const { q, artistName, limit = '10' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing required query parameter: q' });
  }

  const query = artistName
    ? `artist:"${String(artistName)}" track:${String(q)}`
    : String(q);

  try {
    const response = await searchSpotify({ q: query, type: 'track', limit });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const tracks = (data.tracks?.items || []).map(mapTrack);

    return res.json(tracks);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/cover', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing required query parameter: url' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return res.status(400).json({ error: 'Invalid cover URL' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only http/https URLs are supported' });
  }

  try {
    const response = await fetch(parsedUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'Failed to fetch cover image' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(imageBuffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch cover image' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
