const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

app.use(express.json());

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'spotify-api-proxy' });
});

app.get('/api/search', async (req, res) => {
  const { q, type = 'track', limit = '10' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing required query parameter: q' });
  }

  try {
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

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
