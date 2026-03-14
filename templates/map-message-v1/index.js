const { POSTER_HEIGHT, POSTER_WIDTH, escapeHtml } = require('../shared');

const FALLBACK_COVER_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ececec'/%3E%3Cstop offset='100%25' stop-color='%23d9d9d9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='12' fill='url(%23g)'/%3E%3Cpath d='M23 82l21-21 13 13 16-19 24 27H23z' fill='rgba(0,0,0,0.18)'/%3E%3Ccircle cx='42' cy='40' r='8' fill='rgba(0,0,0,0.2)'/%3E%3C/svg%3E";

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

function normalizePayload(payload = {}) {
  const song = payload.song && typeof payload.song === 'object' ? payload.song : {};
  const place = payload.place && typeof payload.place === 'object' ? payload.place : {};
  const time = payload.time && typeof payload.time === 'object' ? payload.time : {};
  const message = payload.message && typeof payload.message === 'object' ? payload.message : {};
  const marker = payload.marker && typeof payload.marker === 'object' ? payload.marker : {};

  const model = {
    template: 'map_message_v1',
    mapQuery: normalizeText(payload.mapQuery),
    marker: {
      type: marker.type === 'pin' ? 'pin' : 'pin',
    },
    song: {
      title: normalizeText(song.title),
      artist: normalizeText(song.artist),
      coverUrl: normalizeText(song.coverUrl),
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
      intro: normalizeText(message.intro),
      main: normalizeText(message.main),
    },
    output: normalizeOutput(payload.output),
  };

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
  const songLine = [model.song.title, model.song.artist].filter(hasContent).join(' · ') || 'Unknown song · Unknown artist';

  return `<section class="overlay-card overlay-card--song" id="song-card">
    <img class="overlay-song-cover" id="song-cover" src="${escapeHtml(safeCover)}" alt="Song cover" loading="eager" decoding="sync" crossorigin="anonymous" referrerpolicy="no-referrer" onerror='this.onerror=null;this.src="${FALLBACK_COVER_DATA_URI}";' />
    <div class="overlay-song-copy">
      <p class="overlay-eyebrow">Now playing</p>
      <p class="overlay-primary" id="song-title">${escapeHtml(songLine)}</p>
    </div>
  </section>`;
}

function renderPlaceCard(model) {
  if (!model.showPlaceCard) return '';

  return `<section class="overlay-card overlay-card--place" id="place-card">
    <p class="overlay-eyebrow">Place</p>
    ${model.place.title ? `<p class="overlay-primary" id="place-title">${escapeHtml(model.place.title)}</p>` : ''}
    ${model.place.subtitle ? `<p class="overlay-secondary" id="place-subtitle">${escapeHtml(model.place.subtitle)}</p>` : ''}
  </section>`;
}

function renderTimeCard(model) {
  if (!model.showTimeCard) return '';

  return `<section class="overlay-card overlay-card--time" id="time-card">
    <p class="overlay-eyebrow">When</p>
    ${model.time.dateText ? `<p class="overlay-secondary" id="time-date">${escapeHtml(model.time.dateText)}</p>` : ''}
    ${model.time.timeText ? `<p class="overlay-primary overlay-time-value" id="time-value">${escapeHtml(model.time.timeText)}</p>` : ''}
  </section>`;
}

function renderMessageBand(model) {
  if (!model.showMessageBand) return '';

  return `<section class="message-band" id="message-band">
    <div class="message-band__copy">
      ${model.showIntro ? `<p class="message-band__support" id="message-band-support">${escapeHtml(model.message.intro)}</p>` : ''}
      ${model.showMain ? `<p class="message-band__hero" id="message-band-hero">${escapeHtml(model.message.main)}</p>` : ''}
    </div>
  </section>`;
}

function renderHtml(model) {
  const mapQuery = model.mapQuery || 'Puerta del Sol, Madrid';

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
      --accent-red: #d7747d;
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
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      padding: 14px;
      gap: 8px;
      overflow: hidden;
    }

    .poster-frame {
      position: relative;
      border: 1px solid var(--map-border);
      padding: 6px;
      background: #f5f5f2;
      min-height: 0;
    }

    .poster-map {
      width: 100%;
      height: 100%;
      min-height: 0;
      background: #f2f2ef;
    }

    .communication-overlay {
      position: absolute;
      inset: 6px;
      z-index: 4;
      pointer-events: none;
    }

    .overlay-card,
    .overlay-message {
      position: absolute;
      background: rgba(250, 250, 247, 0.94);
      border: 1.5px solid rgba(20, 20, 20, 0.62);
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(15, 15, 15, 0.15);
    }

    .overlay-card {
      padding: 8px 9px;
      display: grid;
      gap: 2px;
      max-width: min(44%, 260px);
    }

    .overlay-card--song {
      top: 10px;
      left: 10px;
      grid-template-columns: auto 1fr;
      gap: 8px;
      align-items: center;
    }

    .overlay-card--place {
      top: 30%;
      right: 10px;
      width: min(40%, 240px);
    }

    .overlay-card--time {
      right: 10px;
      top: 54%;
      width: min(40%, 240px);
    }

    .overlay-song-cover {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      object-fit: cover;
      object-position: center;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: #ececeb;
    }

    .overlay-song-copy {
      display: grid;
      gap: 1px;
    }

    .overlay-eyebrow {
      margin: 0;
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #5a5a5a;
    }

    .overlay-primary {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      color: #141414;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overlay-secondary {
      margin: 0;
      font-size: 11px;
      line-height: 1.3;
      color: #3f3f3f;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overlay-time-value {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.05em;
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

    .message-band {
      width: 100%;
      border: 1px solid #cecec9;
      background: #f4f4f1;
      display: grid;
      grid-template-columns: 1fr;
      align-items: start;
      gap: 2px;
      padding: 4px 12px 3px;
      min-height: 96px;
    }

    .message-band__copy {
      text-align: left;
      display: grid;
      align-content: start;
      gap: 2px;
      max-width: 34ch;
    }

    .message-band__support,
    .message-band__hero {
      margin: 0;
      text-wrap: balance;
      text-transform: uppercase;
    }

    .message-band__support {
      font-size: 17px;
      line-height: 1.08;
      font-weight: 650;
      letter-spacing: 0.07em;
      color: #434343;
    }

    .message-band__hero {
      font-family: 'Avenir Next Condensed', 'Franklin Gothic Heavy', 'Arial Narrow', 'Arial Black', 'Inter', sans-serif;
      font-size: 51px;
      line-height: 0.84;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: var(--accent-red);
    }

    .maplibregl-control-container,
    .maplibregl-ctrl-attrib,
    .maplibregl-ctrl-logo {
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
      </section>
    </section>

    ${renderMessageBand(model)}
  </article>

  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>

    const BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
    const DEFAULT_DETAIL_LEVEL = 'Closer';
    const DETAIL_LEVEL_ZOOM_OFFSET = { Close: -0.35, Closer: 0.45, 'Very Close': 1.1 };
    const EXAMPLE_LOCATIONS = {
      'Madrid, Spain': { lat: 40.4168, lon: -3.7038, display_name: 'Madrid, Spain', addresstype: 'city' },
      'Puerta del Sol, Madrid': { lat: 40.4169, lon: -3.7035, display_name: 'Puerta del Sol, Madrid', addresstype: 'amenity' },
      'Paris, France': { lat: 48.8566, lon: 2.3522, display_name: 'Paris, France', addresstype: 'city' },
    };

    const mapQuery = ${JSON.stringify(mapQuery)};
    const markerType = ${JSON.stringify(model.marker.type)};

    function appendDebugMessage(message, level = 'log') {
      const existing = document.getElementById('map-debug-panel');
      const panel = existing || (() => {
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
      })();

      const now = new Date().toISOString().slice(11, 23);
      panel.textContent += '[' + now + '] [' + level.toUpperCase() + '] ' + message + '\n';
    }

    function logStep(step, details) {
      const message = details ? step + ': ' + details : step;
      console.info('[map_message_v1] ' + message);
    }

    function reportBootError(error, phase) {
      const detail = error instanceof Error ? error.name + ': ' + error.message : String(error);
      const stack = error && error.stack ? '\n' + error.stack : '';
      console.error('[map_message_v1] boot failed at ' + phase, error);
      appendDebugMessage('Map boot failed at ' + phase + ' -> ' + detail + stack, 'error');
    }

    function classifyRoadWeight(layerId) {
      if (/(motorway|trunk|primary|highway|arterial|major)/i.test(layerId)) return 'major';
      if (/(secondary|tertiary)/i.test(layerId)) return 'secondary';
      return 'minor';
    }

    function restyleLayer(layer) {
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
      return Math.max(13, Math.min(19, baseZoom + offset));
    }

    async function geocodePlace(query) {
      if (EXAMPLE_LOCATIONS[query]) return EXAMPLE_LOCATIONS[query];

      const endpoint = new URL('https://nominatim.openstreetmap.org/search');
      endpoint.searchParams.set('q', query);
      endpoint.searchParams.set('format', 'jsonv2');
      endpoint.searchParams.set('limit', '1');
      endpoint.searchParams.set('addressdetails', '1');

      logStep('before geocoding', endpoint.toString());
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Geocoding failed');
      const results = await response.json();
      if (!Array.isArray(results) || !results.length) throw new Error('No place found');
      logStep('after geocoding', JSON.stringify({ lat: results[0]?.lat, lon: results[0]?.lon, type: results[0]?.addresstype || results[0]?.type }));
      return results[0];
    }

    async function loadMonochromeEditorialStyle() {
      logStep('before style fetch', BASE_STYLE_URL);
      const response = await fetch(BASE_STYLE_URL);
      if (!response.ok) throw new Error('Style fetch failed');
      const style = await response.json();
      logStep('after style fetch', 'layers=' + (Array.isArray(style.layers) ? style.layers.length : 0));
      return { ...style, layers: (style.layers || []).map(restyleLayer) };
    }

    async function boot() {
      let phase = 'init';
      try {
        phase = 'maplibre import check';
        if (!window.maplibregl || typeof window.maplibregl.Map !== 'function') {
          throw new Error('MapLibre failed to load from CDN script');
        }

        phase = 'geocoding';
        const result = await geocodePlace(mapQuery || 'Puerta del Sol, Madrid');
        const center = [Number(result.lon), Number(result.lat)];
        const zoom = chooseZoomForPlace(result, DEFAULT_DETAIL_LEVEL);

        phase = 'style fetch';
        const style = await loadMonochromeEditorialStyle();

        phase = 'map creation';
        logStep('before map creation', JSON.stringify({ center, zoom }));
        const map = new maplibregl.Map({
          container: 'map',
          style,
          center,
          zoom,
          attributionControl: false,
          interactive: false,
        });
        logStep('after map creation');

        map.on('error', (event) => {
          const mapError = event?.error || new Error('Unknown MapLibre runtime error');
          reportBootError(mapError, 'map runtime');
        });

        if (markerType === 'pin') {
          const markerEl = document.createElement('div');
          markerEl.className = 'pin-marker';
          markerEl.innerHTML = '<div class="pin-marker__inner" aria-hidden="true"></div>';
          new maplibregl.Marker({ element: markerEl, anchor: 'bottom' }).setLngLat(center).addTo(map);
        }

        phase = 'awaiting map idle';
        map.once('idle', () => {
          logStep('after map idle');
          window.__MAP_READY = true;
        });
      } catch (error) {
        reportBootError(error, phase);
        window.__MAP_READY = true;
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
