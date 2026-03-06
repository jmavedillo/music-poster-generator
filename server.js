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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
