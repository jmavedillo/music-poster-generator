const { POSTER_HEIGHT, POSTER_WIDTH, escapeHtml } = require('../shared');

const FALLBACK_COVER_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ececec'/%3E%3Cstop offset='100%25' stop-color='%23d9d9d9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='12' fill='url(%23g)'/%3E%3Cpath d='M23 82l21-21 13 13 16-19 24 27H23z' fill='rgba(0,0,0,0.18)'/%3E%3Ccircle cx='42' cy='40' r='8' fill='rgba(0,0,0,0.2)'/%3E%3C/svg%3E";
const INTRO_MAX_LENGTH = 56;
const MAIN_MAX_LENGTH = 86;
const ALLOWED_STYLE_VARIANTS = new Set(['style1', 'style2', 'style3']);

function clampText(value, maxLength) {
  const text = normalizeText(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function getMessageSizeClass(length, thresholds, classes) {
  for (let i = 0; i < thresholds.length; i += 1) {
    if (length <= thresholds[i]) {
      return classes[i];
    }
  }

  return classes[classes.length - 1];
}

function normalizeOutput(output = {}) {
  const width = Number(output.width);
  const quality = Number(output.quality);

  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1000,
    format: output.format === 'png' ? 'png' : 'jpeg',
    quality: Number.isFinite(quality) ? quality : 0.92,
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hasContent(value) {
  return normalizeText(value).length > 0;
}

function hasObjectContent(obj, keys) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return keys.some((key) => hasContent(obj[key]));
}

function normalizeSpotifyUrl(value) {
  const normalized = normalizeText(value);

  if (/^https?:\/\/open\.spotify\.com\/track\//i.test(normalized)) {
    return normalized;
  }

  const uriMatch = normalized.match(/^spotify:track:([a-zA-Z0-9]+)$/i);
  if (uriMatch) {
    return `https://open.spotify.com/track/${uriMatch[1]}`;
  }

  return '';
}

function normalizeStyleVariant(value) {
  const normalized = normalizeText(value).toLowerCase();
  return ALLOWED_STYLE_VARIANTS.has(normalized) ? normalized : 'style1';
}

function normalizePayload(payload = {}) {
  const song = payload.song && typeof payload.song === 'object' ? payload.song : {};
  const place = payload.place && typeof payload.place === 'object' ? payload.place : {};
  const time = payload.time && typeof payload.time === 'object' ? payload.time : {};
  const message = payload.message && typeof payload.message === 'object' ? payload.message : {};
  const marker = payload.marker && typeof payload.marker === 'object' ? payload.marker : {};

  const model = {
    template: 'map_message_v1',
    styleVariant: normalizeStyleVariant(payload.styleVariant),
    mapQuery: normalizeText(payload.mapQuery),
    marker: {
      type: marker.type === 'pin' ? 'pin' : 'pin',
    },
    song: {
      title: normalizeText(song.title),
      artist: normalizeText(song.artist),
      coverUrl: normalizeText(song.coverUrl),
      spotifyUrl: normalizeSpotifyUrl(song.spotifyUrl || song.uri),
    },
    place: {
      title: normalizeText(place.title),
      subtitle: normalizeText(place.subtitle),
    },
    time: {
      dateText: normalizeText(time.dateText),
      timeText: normalizeText(time.timeText),
    },
    message: {
      intro: clampText(message.intro, INTRO_MAX_LENGTH),
      main: clampText(message.main, MAIN_MAX_LENGTH),
    },
    output: normalizeOutput(payload.output),
  };

  if (!hasObjectContent(model.place, ['title', 'subtitle']) && hasContent(model.mapQuery)) {
    model.place.title = model.mapQuery;
    model.place.subtitle = '';
  }

  model.showSongCard = hasObjectContent(model.song, ['title', 'artist', 'coverUrl']);
  model.showPlaceCard = hasObjectContent(model.place, ['title', 'subtitle']);
  model.showTimeCard = hasObjectContent(model.time, ['dateText', 'timeText']);
  model.showIntro = hasContent(model.message.intro);
  model.showMain = hasContent(model.message.main);
  model.showMessageBand = model.showIntro || model.showMain;

  return model;
}

function renderSongCard(model) {
  if (!model.showSongCard) return '';

  const safeCover = model.song.coverUrl || FALLBACK_COVER_DATA_URI;
  const songTitle = model.song.title || 'Unknown song';
  const songArtist = model.song.artist || 'Unknown artist';

  return `<section class="overlay-card overlay-card--song" id="song-card">
    <img class="overlay-song-cover" id="song-cover" src="${escapeHtml(safeCover)}" alt="Song cover" loading="eager" decoding="sync" crossorigin="anonymous" referrerpolicy="no-referrer" onerror='this.onerror=null;this.src="${FALLBACK_COVER_DATA_URI}";' />
    <div class="overlay-song-copy">
      <p class="overlay-eyebrow">NOW PLAYING</p>
      <p class="overlay-primary overlay-song-title" id="song-title">${escapeHtml(songTitle)}</p>
      <p class="overlay-secondary overlay-song-artist" id="song-artist">${escapeHtml(songArtist)}</p>
    </div>
  </section>`;
}

function renderPlaceCard(model) {
  if (!model.showPlaceCard) return '';

  const placeTitle = model.place.title || '';
  const placeSubtitle = model.place.subtitle || '';

  return `<section class="overlay-card overlay-card--place" id="place-card">
    <p class="overlay-eyebrow">PLACE</p>
    <p class="overlay-primary" id="place-title">${escapeHtml(placeTitle)}</p>
    <p class="overlay-secondary overlay-secondary--place" id="place-subtitle">${escapeHtml(placeSubtitle)}</p>
  </section>`;
}

function renderTimeCard(model) {
  if (!model.showTimeCard) return '';

  const whenParts = [model.time.dateText, model.time.timeText].filter(Boolean);
  const whenText = whenParts.join(' • ');

  return `<section class="overlay-card overlay-card--time" id="time-card">
    <p class="overlay-eyebrow">WHEN</p>
    ${whenText ? `<p class="overlay-primary overlay-time-line" id="time-value">${escapeHtml(whenText)}</p>` : ''}
  </section>`;
}

function renderMessageBand(model) {
  if (!model.showMessageBand) return '';

  const heroClass = getMessageSizeClass(model.message.main.length, [20, 36, 54, 72], ['message-strip--hero-xl', 'message-strip--hero-lg', 'message-strip--hero-md', 'message-strip--hero-sm', 'message-strip--hero-xs']);
  const supportClass = getMessageSizeClass(model.message.intro.length, [24, 40], ['message-strip--support-lg', 'message-strip--support-md', 'message-strip--support-sm']);

  return `<section class="message-strips" id="message-band">
    ${model.showIntro ? `<p class="message-strip message-strip--support ${supportClass}" id="message-band-support">${escapeHtml(model.message.intro)}</p>` : ''}
    ${model.showMain ? `<p class="message-strip message-strip--hero ${heroClass}" id="message-band-hero">${escapeHtml(model.message.main)}</p>` : ''}
  </section>`;
}

function renderHtml(model) {
  const mapQuery = model.mapQuery || 'Puerta del Sol, Madrid';
  const isStyle2 = model.styleVariant === 'style2';
  const accentColor = isStyle2 ? '#f29a9f' : '#d72638';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <style>
    @page { size: ${POSTER_WIDTH}px ${POSTER_HEIGHT}px; margin: 0; }
    :root {
      --poster-bg: #f8f8f5;
      --poster-border: #cecec9;
      --map-border: #d9d9d3;
      --text-main: #131313;
      --text-muted: #4c4c4c;
      --accent-red: ${accentColor};
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${POSTER_WIDTH}px;
      height: ${POSTER_HEIGHT}px;
      overflow: hidden;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: var(--text-main);
      background: #e9e8e4;
    }

    .poster {
      width: 100%;
      height: 100%;
      background: var(--poster-bg);
      border: 1px solid var(--poster-border);
      box-shadow: 0 12px 28px rgba(24, 24, 24, 0.2), 0 2px 7px rgba(24, 24, 24, 0.14);
      display: block;
      padding: 14px;
      overflow: hidden;
    }

    .poster-frame {
      position: relative;
      border: 1px solid var(--map-border);
      padding: 7px;
      background: #f5f5f2;
      min-height: 0;
      height: 100%;
    }

    .poster-map {
      width: 100%;
      height: 100%;
      min-height: 0;
      background: #f2f2ef;
    }

    .communication-overlay {
      position: absolute;
      inset: 7px;
      z-index: 4;
      pointer-events: none;
    }

    .overlay-card,
    .overlay-message {
      position: absolute;
      background: #ffffff;
      border: none;
      border-radius: 3px;
      box-shadow: none;
    }

    .overlay-card {
      padding: 7px 8px;
      display: grid;
      gap: 2px;
      max-width: min(45%, 280px);
    }

    .overlay-card--song {
      top: 15px;
      left: 10px;
      right: 10px;
      grid-template-columns: auto 1fr;
      gap: 7px;
      align-items: center;
      max-width: none;
      min-height: 52px;
    }

    .overlay-card--place {
      top: 42%;
      left: 62%;
      width: min(40%, 240px);
    }

    .overlay-card--time {
      left: 62%;
      top: calc(42% + 74px);
      width: min(40%, 240px);
      padding-top: 6px;
      padding-bottom: 6px;
    }

    .overlay-song-cover {
      width: 38px;
      height: 38px;
      border-radius: 2px;
      object-fit: cover;
      object-position: center;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: #ececeb;
    }

    .overlay-song-copy {
      display: grid;
      gap: 2px;
    }

    .overlay-song-title,
    .overlay-song-artist {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overlay-song-title {
      font-size: 13px;
      line-height: 1.2;
    }

    .overlay-song-artist {
      font-size: 11px;
      line-height: 1.2;
    }

    .overlay-eyebrow {
      margin: 0;
      font-size: 8px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5a5a5a;
    }

    .overlay-primary {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.22;
      color: #141414;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overlay-secondary {
      margin: 0;
      font-size: 11px;
      line-height: 1.3;
      color: #3f3f3f;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overlay-secondary--place {
      min-height: 1.3em;
    }

    .overlay-time-line {
      font-size: 12px;
      font-weight: 650;
      line-height: 1.2;
      letter-spacing: 0.02em;
    }

    .pin-marker {
      width: 52px;
      height: 68px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      filter: drop-shadow(0 8px 10px rgba(20, 20, 20, 0.28));
    }

    .pin-marker__inner {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: var(--accent-red);
    }

    .pin-marker__inner::before {
      content: '';
      position: absolute;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #f9f9f8;
      top: 13px;
      left: 13px;
    }

    .message-strips {
      position: absolute;
      left: -24px;
      bottom: 34px;
      z-index: 5;
      display: grid;
      gap: 5px;
      justify-items: start;
    }

    .message-strip {
      margin: 0;
      text-transform: uppercase;
      background: #ffffff;
      border: none;
      box-shadow: none;
      width: fit-content;
      max-width: min(calc(80% + 24px), 38ch);
      padding: 2px 12px 1px 36px;
      overflow: hidden;
    }

    .message-strip--support {
      line-height: 1.08;
      font-weight: 650;
      letter-spacing: 0.06em;
      color: #303030;
    }

    .message-strip--support-lg { font-size: 15px; }
    .message-strip--support-md { font-size: 14px; }
    .message-strip--support-sm { font-size: 13px; }

    .message-strip--hero {
      font-family: 'Avenir Next Condensed', 'Franklin Gothic Heavy', 'Arial Narrow', 'Arial Black', 'Inter', sans-serif;
      line-height: 0.86;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: var(--accent-red);
      padding: 1px 14px 0 36px;
      max-width: min(calc(76% + 24px), 30ch);
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .message-strip--hero-xl { font-size: 60px; }
    .message-strip--hero-lg { font-size: 58px; }
    .message-strip--hero-md { font-size: 55px; }
    .message-strip--hero-sm { font-size: 52px; }
    .message-strip--hero-xs { font-size: 48px; }

    .maplibregl-ctrl-top-right { top: 10px; right: 10px; }
    .maplibregl-ctrl-bottom-right {
      right: 8px;
      top: 72px;
      bottom: auto;
    }
    .maplibregl-ctrl-group {
      border-radius: 2px;
      border: 1px solid rgba(22, 22, 22, 0.55);
      box-shadow: none;
    }
    .maplibregl-ctrl button {
      width: 24px;
      height: 24px;
    }
    .maplibregl-ctrl-attrib {
      display: none !important;
    }
  </style>
</head>
<body>
  <article class="poster">
    <section class="poster-frame">
      <div id="map" class="poster-map" aria-hidden="true"></div>
      <section class="communication-overlay">
        ${renderSongCard(model)}
        ${renderPlaceCard(model)}
        ${renderTimeCard(model)}
        ${renderMessageBand(model)}
      </section>
    </section>
  </article>

  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>

    const BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
    const DEFAULT_DETAIL_LEVEL = 'Closer';
    const DETAIL_LEVEL_ZOOM_OFFSET = { Close: -0.8, Closer: -0.2, 'Very Close': 0.4 };
    const CONTEXT_ZOOM_REDUCTION = 2.15;
    const PIN_VERTICAL_OFFSET_PX = 76;
    const PIN_HORIZONTAL_OFFSET_PX = 72;
    const SHOW_ZOOM_CONTROL = false;
    const EXAMPLE_LOCATIONS = {
      'Madrid, Spain': { lat: 40.4168, lon: -3.7038, display_name: 'Madrid, Spain', addresstype: 'city' },
      'Puerta del Sol, Madrid': { lat: 40.4169, lon: -3.7035, display_name: 'Puerta del Sol, Madrid', addresstype: 'amenity' },
      'Paris, France': { lat: 48.8566, lon: 2.3522, display_name: 'Paris, France', addresstype: 'city' },
    };

    const mapQuery = ${JSON.stringify(mapQuery)};
    const markerType = ${JSON.stringify(model.marker.type)};
    const styleVariant = ${JSON.stringify(model.styleVariant)};

    window.__MAP_READY = false;
    window.__MAP_FAILED = false;
    window.__MAP_ERROR = '';
    window.__MAP_DEBUG = [];
    window.__MAP_RESOLVED = null;

    function normalizeCoordinate(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function buildGoogleMapsPlaceUrl(lat, lng) {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lat + ',' + lng);
    }

    function buildGoogleMapsDirectionsUrl(lat, lng) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(lat + ',' + lng);
    }

    function logStep(step, details) {
      const message = details ? step + ': ' + details : step;
      window.__MAP_DEBUG.push(message);
      console.info('[map_message_v1] ' + message);
    }

    function ensureDebugPanel() {
      const existing = document.getElementById('map-debug-panel');
      if (existing) return existing;

      const el = document.createElement('pre');
      el.id = 'map-debug-panel';
      el.style.position = 'absolute';
      el.style.left = '10px';
      el.style.right = '10px';
      el.style.bottom = '10px';
      el.style.maxHeight = '38%';
      el.style.overflow = 'auto';
      el.style.padding = '10px 12px';
      el.style.margin = '0';
      el.style.zIndex = '30';
      el.style.font = '12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      el.style.whiteSpace = 'pre-wrap';
      el.style.background = 'rgba(255, 255, 255, 0.96)';
      el.style.border = '1px solid rgba(130, 35, 35, 0.6)';
      el.style.color = '#651515';
      document.querySelector('.poster-frame')?.appendChild(el);
      return el;
    }

    function renderDebugPanel(phase, detail) {
      const panel = ensureDebugPanel();
      const lines = [
        'MAP DEBUG (temporary)',
        'phase: ' + phase,
        'error: ' + detail,
        'steps:',
        ...(window.__MAP_DEBUG || []).map((step, index) => '  ' + (index + 1) + '. ' + step),
      ];
      panel.textContent = lines.join('\\n');
    }

    function reportBootError(error, phase) {
      const detail = error instanceof Error ? error.name + ': ' + error.message : String(error);
      const readable = 'map boot failed: ' + detail;
      window.__MAP_FAILED = true;
      window.__MAP_ERROR = readable;
      logStep(readable);
      console.error('[map_message_v1] boot failed at ' + phase, error);
      renderDebugPanel(phase, detail);
    }

    function classifyRoadWeight(layerId) {
      if (/(motorway|trunk|primary|highway|arterial|major)/i.test(layerId)) return 'major';
      if (/(secondary|tertiary)/i.test(layerId)) return 'secondary';
      return 'minor';
    }

    function restyleLayerStyle1(layer) {
      const id = layer.id || '';

      if (layer.type === 'symbol') return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } };
      if (layer.type === 'circle' || layer.type === 'heatmap' || layer.type === 'fill-extrusion') {
        return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } };
      }

      if (layer.type === 'background') {
        return { ...layer, paint: { ...(layer.paint || {}), 'background-color': '#f3f3f0' } };
      }

      if (layer.type === 'fill') {
        if (/(water|ocean|river|lake|reservoir)/i.test(id)) {
          return { ...layer, paint: { ...(layer.paint || {}), 'fill-color': '#e7e7e3', 'fill-opacity': 0.9 } };
        }
        if (/(building)/i.test(id)) {
          return { ...layer, paint: { ...(layer.paint || {}), 'fill-color': '#d9d9d5', 'fill-opacity': 0.45 } };
        }
        if (/(park|grass|wood|forest|landcover|landuse|cemetery|pitch)/i.test(id)) {
          return { ...layer, paint: { ...(layer.paint || {}), 'fill-color': '#eeeeeb', 'fill-opacity': 0.8 } };
        }
        return { ...layer, paint: { ...(layer.paint || {}), 'fill-color': '#f0f0ec', 'fill-opacity': 0.85 } };
      }

      if (layer.type === 'line') {
        if (/(boundary|admin|border)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'line-color': '#b3b3ae',
              'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.2, 12, 0.7, 16, 1.1],
              'line-opacity': 0.55,
            },
          };
        }

        const roadWeight = classifyRoadWeight(id);
        const roadPalette = {
          major: { color: '#262626', width: ['interpolate', ['linear'], ['zoom'], 8, 0.9, 12, 1.7, 15, 2.8, 17, 4.1] },
          secondary: { color: '#535353', width: ['interpolate', ['linear'], ['zoom'], 8, 0.55, 12, 1.05, 15, 1.65, 17, 2.4] },
          minor: { color: '#888888', width: ['interpolate', ['linear'], ['zoom'], 8, 0.22, 12, 0.52, 15, 0.95, 17, 1.45] },
        };

        const pick = roadPalette[roadWeight];
        return {
          ...layer,
          paint: {
            ...(layer.paint || {}),
            'line-color': pick.color,
            'line-width': pick.width,
            'line-opacity': 0.95,
          },
        };
      }

      return layer;
    }

    function restyleLayerStyle2(layer) {
      const id = layer.id || '';

      if (layer.type === 'symbol' || layer.type === 'circle' || layer.type === 'heatmap' || layer.type === 'fill-extrusion') {
        return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } };
      }

      if (layer.type === 'background') {
        return { ...layer, paint: { ...(layer.paint || {}), 'background-color': '#08192f' } };
      }

      if (layer.type === 'fill') {
        if (/(water|ocean|river|lake|reservoir|basin)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'fill-color': '#0d2f4d',
              'fill-opacity': 0.92,
            },
          };
        }

        if (/(building|building-part|structure|footprint)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'fill-color': '#9ec8de',
              'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.32, 13, 0.52, 16, 0.72],
            },
          };
        }

        if (/(park|grass|wood|forest|landcover|landuse|cemetery|pitch|recreation)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'fill-color': '#123857',
              'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.04, 13, 0.1, 16, 0.16],
            },
          };
        }

        if (/(residential|commercial|industrial|construction|neighbourhood|neighborhood)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'fill-color': '#123857',
              'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.03, 13, 0.08, 16, 0.12],
            },
          };
        }

        return {
          ...layer,
          paint: {
            ...(layer.paint || {}),
            'fill-color': '#102b46',
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.03, 13, 0.08, 16, 0.12],
          },
        };
      }

      if (layer.type === 'line') {
        if (/(boundary|admin|border)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'line-color': '#5ca0c9',
              'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.12, 12, 0.38, 16, 0.62],
              'line-opacity': 0.38,
            },
          };
        }

        if (/(bridge|tunnel|rail|transit|ferry)/i.test(id)) {
          return {
            ...layer,
            paint: {
              ...(layer.paint || {}),
              'line-color': '#6db6dc',
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.08, 12, 0.3, 16, 0.62],
              'line-opacity': 0.28,
            },
          };
        }

        const roadWeight = classifyRoadWeight(id);
        const roadPalette = {
          major: { width: ['interpolate', ['linear'], ['zoom'], 8, 0.08, 12, 0.3, 15, 0.58, 17, 0.85], opacity: 0.26 },
          secondary: { width: ['interpolate', ['linear'], ['zoom'], 8, 0.05, 12, 0.2, 15, 0.42, 17, 0.66], opacity: 0.2 },
          minor: { width: ['interpolate', ['linear'], ['zoom'], 8, 0.02, 12, 0.12, 15, 0.26, 17, 0.42], opacity: 0.14 },
        };

        const pick = roadPalette[roadWeight];
        return {
          ...layer,
          paint: {
            ...(layer.paint || {}),
            'line-color': '#8bc6e0',
            'line-width': pick.width,
            'line-opacity': pick.opacity,
          },
        };
      }

      return layer;
    }

    function restyleLayerStyle3(layer) {
      // Placeholder branch: currently keeps style1 visuals until style3 design is defined.
      return restyleLayerStyle1(layer);
    }

    function resolveMapStyleVariant(variant) {
      switch (variant) {
        case 'style2':
          return {
            variant: 'style2',
            styleUrl: BASE_STYLE_URL,
            restyleLayer: restyleLayerStyle2,
          };
        case 'style3':
          return {
            variant: 'style3',
            styleUrl: BASE_STYLE_URL,
            restyleLayer: restyleLayerStyle3,
          };
        case 'style1':
        default:
          return {
            variant: 'style1',
            styleUrl: BASE_STYLE_URL,
            restyleLayer: restyleLayerStyle1,
          };
      }
    }

    function chooseZoomForPlace(result, detailLevel) {
      const broadAreaTypes = new Set(['country', 'state', 'region', 'county']);
      const neighborhoodTypes = new Set(['suburb', 'neighbourhood', 'quarter', 'district']);
      const cityTypes = new Set(['city', 'town', 'village', 'municipality']);
      const poiTypes = new Set(['house', 'building', 'amenity', 'office', 'retail', 'shop', 'tourism', 'attraction', 'school', 'university', 'hospital']);

      const type = (result.addresstype || result.type || '').toLowerCase();
      const klass = (result.class || '').toLowerCase();
      let baseZoom = 15;

      if (poiTypes.has(type) || klass === 'amenity' || klass === 'shop' || klass === 'tourism') baseZoom = 17.2;
      else if (type.includes('road') || klass === 'highway' || type === 'street') baseZoom = 16.5;
      else if (neighborhoodTypes.has(type)) baseZoom = 16;
      else if (cityTypes.has(type)) baseZoom = 14.8;
      else if (broadAreaTypes.has(type)) baseZoom = 13.1;

      if (result.boundingbox?.length === 4) {
        const [south, north, west, east] = result.boundingbox.map(Number);
        const span = Math.max(Math.abs(north - south), Math.abs(east - west));

        if (Number.isFinite(span)) {
          if (span < 0.01) baseZoom = Math.max(baseZoom, 17.3);
          else if (span < 0.03) baseZoom = Math.max(baseZoom, 16.7);
          else if (span < 0.08) baseZoom = Math.max(baseZoom, 16.1);
          else if (span < 0.2) baseZoom = Math.max(baseZoom, 15.4);
          else if (span < 0.45) baseZoom = Math.max(baseZoom, 14.7);
          else if (span < 0.9) baseZoom = Math.max(baseZoom, 14.1);
          else baseZoom = Math.max(baseZoom, 13.2);
        }
      }

      const offset = DETAIL_LEVEL_ZOOM_OFFSET[detailLevel] ?? DETAIL_LEVEL_ZOOM_OFFSET[DEFAULT_DETAIL_LEVEL];
      return Math.max(11.6, Math.min(18.2, baseZoom + offset - CONTEXT_ZOOM_REDUCTION));
    }

    function offsetCenterForPin([lng, lat], zoom, pixelOffsetX, pixelOffsetY) {
      const worldSize = Math.pow(2, zoom) * 512;
      const lonPerPixel = 360 / worldSize;
      const latPerPixel = 360 / (Math.pow(2, zoom) * 512);
      return [lng + (pixelOffsetX * lonPerPixel), lat - (pixelOffsetY * latPerPixel)];
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function updateInfoCardsLayout(map, pinCenter) {
      const overlay = document.querySelector('.communication-overlay');
      const placeCard = document.getElementById('place-card');
      const timeCard = document.getElementById('time-card');
      if (!overlay || (!placeCard && !timeCard)) return;

      const point = map.project(pinCenter);
      const overlayRect = overlay.getBoundingClientRect();
      const pinTop = point.y - 68;
      const pinCenterY = pinTop + 34;
      const sideGap = 18;
      const placeWidth = placeCard ? placeCard.offsetWidth : Math.min(240, overlayRect.width * 0.4);
      const placeHeight = placeCard ? placeCard.offsetHeight : 64;
      const minLeft = point.x + 22 + sideGap;
      const placeLeft = clamp(minLeft, 26, overlayRect.width - placeWidth - 16);
      let placeTop = clamp(pinCenterY - (placeHeight / 2), 18, overlayRect.height - placeHeight - 18);

      if (placeCard) {
        placeCard.style.top = placeTop + 'px';
        placeCard.style.left = placeLeft + 'px';
      }

      if (timeCard) {
        const timeHeight = timeCard.offsetHeight || 52;
        const gap = 12;
        let timeTop = placeTop + placeHeight + gap;
        const maxTimeTop = overlayRect.height - timeHeight - 18;

        if (timeTop > maxTimeTop) {
          const shiftUp = timeTop - maxTimeTop;
          placeTop = clamp(placeTop - shiftUp, 18, overlayRect.height - placeHeight - 18);
          if (placeCard) {
            placeCard.style.top = placeTop + 'px';
          }
          timeTop = placeTop + placeHeight + gap;
        }

        timeCard.style.top = clamp(timeTop, 18, maxTimeTop) + 'px';
        timeCard.style.left = placeLeft + 'px';
      }
    }

    function derivePlaceLinesClient(result) {
      if (!result || typeof result !== 'object') return { title: '', subtitle: '' };
      const address = result.address && typeof result.address === 'object' ? result.address : {};
      const title = [address.attraction, address.amenity, address.building, address.road, address.pedestrian, address.neighbourhood, result.name]
        .find((value) => String(value || '').trim().length > 0) || '';
      const broad = [address.suburb, address.city_district, address.city, address.town, address.village, address.county, address.state, address.country]
        .filter((value) => String(value || '').trim().length > 0)
        .slice(0, 2)
        .join(', ');
      return { title: String(title).trim(), subtitle: String(broad).trim() };
    }

    function hydratePlaceTextFromGeocode(result) {
      const placeTitle = document.getElementById('place-title');
      const placeSubtitle = document.getElementById('place-subtitle');
      if (!placeTitle && !placeSubtitle) return;

      const geocoded = derivePlaceLinesClient(result);

      const currentTitle = placeTitle ? placeTitle.textContent.trim() : '';
      const canUpdateTitle = !currentTitle || currentTitle.toLowerCase() === String(mapQuery || '').trim().toLowerCase();

      if (placeTitle && geocoded.title && canUpdateTitle) {
        placeTitle.textContent = geocoded.title;
      }

      if (placeSubtitle && geocoded.subtitle) {
        placeSubtitle.textContent = geocoded.subtitle;
      }
    }

    async function geocodePlace(query) {
      if (EXAMPLE_LOCATIONS[query]) return EXAMPLE_LOCATIONS[query];

      const endpoint = new URL('https://nominatim.openstreetmap.org/search');
      endpoint.searchParams.set('q', query);
      endpoint.searchParams.set('format', 'jsonv2');
      endpoint.searchParams.set('limit', '1');
      endpoint.searchParams.set('addressdetails', '1');

      logStep('starting geocoding', endpoint.toString());
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Geocoding failed');
      const results = await response.json();
      if (!Array.isArray(results) || !results.length) throw new Error('No place found');
      logStep('geocoding success', JSON.stringify({ lat: results[0]?.lat, lon: results[0]?.lon, type: results[0]?.addresstype || results[0]?.type }));
      return results[0];
    }

    async function loadMonochromeEditorialStyle(styleConfig) {
      logStep('starting style fetch', styleConfig.styleUrl + ' (' + styleConfig.variant + ')');
      const response = await fetch(styleConfig.styleUrl);
      if (!response.ok) throw new Error('Style fetch failed');
      const style = await response.json();
      logStep('style fetch success', 'layers=' + (Array.isArray(style.layers) ? style.layers.length : 0));
      return { ...style, layers: (style.layers || []).map(styleConfig.restyleLayer) };
    }

    async function boot() {
      let phase = 'init';
      try {
        phase = 'maplibre import check';
        if (!window.maplibregl || typeof window.maplibregl.Map !== 'function') {
          throw new Error('MapLibre failed to load from CDN script');
        }
        logStep('maplibre loaded');

        phase = 'geocoding';
        const result = await geocodePlace(mapQuery || 'Puerta del Sol, Madrid');
        const pinLat = normalizeCoordinate(result.lat);
        const pinLng = normalizeCoordinate(result.lon);
        if (pinLat === null || pinLng === null) {
          throw new Error('Geocoding returned invalid coordinates');
        }

        window.__MAP_RESOLVED = {
          lat: pinLat,
          lng: pinLng,
          googleMapsUrl: buildGoogleMapsPlaceUrl(pinLat, pinLng),
          googleMapsDirectionsUrl: buildGoogleMapsDirectionsUrl(pinLat, pinLng),
        };

        const pinCenter = [pinLng, pinLat];
        const zoom = chooseZoomForPlace(result, DEFAULT_DETAIL_LEVEL);
        const mapCenter = offsetCenterForPin(pinCenter, zoom, PIN_HORIZONTAL_OFFSET_PX, PIN_VERTICAL_OFFSET_PX);
        const mapStyleConfig = resolveMapStyleVariant(styleVariant);
        logStep('style variant resolved', mapStyleConfig.variant);

        phase = 'style fetch';
        const style = await loadMonochromeEditorialStyle(mapStyleConfig);

        phase = 'map creation';
        logStep('creating map', JSON.stringify({ center: mapCenter, pinCenter, zoom }));
        const map = new maplibregl.Map({
          container: 'map',
          style,
          center: mapCenter,
          zoom,
          attributionControl: false,
          interactive: false,
        });

        if (SHOW_ZOOM_CONTROL) {
          map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        }

        map.on('error', (event) => {
          const mapError = event?.error || new Error('Unknown MapLibre runtime error');
          reportBootError(mapError, 'map runtime');
        });

        if (markerType === 'pin') {
          const markerEl = document.createElement('div');
          markerEl.className = 'pin-marker';
          markerEl.innerHTML = '<div class="pin-marker__inner" aria-hidden="true"></div>';
          new maplibregl.Marker({ element: markerEl, anchor: 'bottom' }).setLngLat(pinCenter).addTo(map);
        }

        hydratePlaceTextFromGeocode(result);
        map.on('render', () => updateInfoCardsLayout(map, pinCenter));
        updateInfoCardsLayout(map, pinCenter);

        phase = 'awaiting map idle';
        map.once('idle', () => {
          logStep('map idle');
          window.__MAP_READY = true;
        });
      } catch (error) {
        reportBootError(error, phase);
      }
    }

    boot();
  </script>
</body>
</html>`;
}

module.exports = {
  id: 'map_message_v1',
  displayName: 'Map Message',
  description: 'Location-based message poster with map background and cards.',
  defaultTheme: 'light',
  normalizePayload,
  renderHtml,
};
