const { POSTER_HEIGHT, POSTER_WIDTH, escapeHtml, normalizeCommonPayload, resolveProgressRatio } = require('../shared');

const fs = require('node:fs');
const path = require('node:path');

function resolveFontPath(fileName) {
  const candidates = [
    path.join(__dirname, '../../assets/fonts', fileName),
    path.join(__dirname, '../../assets', fileName),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const POSTER_SANS_REGULAR_PATH = resolveFontPath('DejaVuSans.ttf');
const POSTER_SANS_BOLD_PATH = resolveFontPath('DejaVuSans-Bold.ttf');
const INTER_LIGHT_PATH = resolveFontPath('Inter-Light.ttf') || resolveFontPath('DejaVuSans-ExtraLight.ttf');
const INTER_BOLD_PATH = resolveFontPath('Inter-Bold.ttf') || POSTER_SANS_BOLD_PATH;

function buildFontFace(fontPath, weight) {
  if (!fontPath) {
    return '';
  }

  const fontBase64 = fs.readFileSync(fontPath).toString('base64');
  return `@font-face { font-family: 'PosterSans'; src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype'); font-weight: ${weight}; font-style: normal; font-display: block; }`;
}

function buildNamedFontFace(fontPath, family, weight) {
  if (!fontPath) {
    return '';
  }

  const fontBase64 = fs.readFileSync(fontPath).toString('base64');
  return `@font-face { font-family: '${family}'; src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype'); font-weight: ${weight}; font-style: normal; font-display: block; }`;
}

const FONT_FACE_CSS = [buildFontFace(POSTER_SANS_REGULAR_PATH, '400'), buildFontFace(POSTER_SANS_BOLD_PATH, '700 900')]
  .filter(Boolean)
  .join('\n    ');

const INTER_FONT_FACE_CSS = [
  buildNamedFontFace(INTER_LIGHT_PATH, 'PosterInter', '300'),
  buildNamedFontFace(INTER_BOLD_PATH, 'PosterInter', '700'),
]
  .filter(Boolean)
  .join('\n    ');

const WAVE_BAR_HEIGHTS = [12, 22, 10, 30, 16, 36, 12, 42, 18, 30, 12, 34, 14, 26, 12];

function normalizeTheme(theme) {
  return ['bw', 'color', 'lofi'].includes(theme) ? theme : 'bw';
}

function normalizePayload(payload) {
  const normalized = normalizeCommonPayload(payload, { templateId: 'minimal-clean-v1' });

  return {
    ...normalized,
    theme: normalizeTheme(payload?.theme),
  };
}

function renderWaveBars() {
  return WAVE_BAR_HEIGHTS.map((height) => `<span style="--h:${height}px"></span>`).join('');
}

function renderSpotifyCode(spotifyCodeSvg) {
  if (!spotifyCodeSvg) {
    return `<div class="wave-bars">${renderWaveBars()}</div>`;
  }

  return `<!-- spotify-code-svg:real --><div class="spotify-code-real">${spotifyCodeSvg}</div>`;
}

function renderHtml(model) {
  const themeClass = `poster-theme-${normalizeTheme(model.theme)}`;
  const progressPercent = Math.round(resolveProgressRatio(model.track.currentTime, model.track.totalTime) * 100);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: ${POSTER_WIDTH}px ${POSTER_HEIGHT}px; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    ${FONT_FACE_CSS}
    ${INTER_FONT_FACE_CSS}
    body {
      width: ${POSTER_WIDTH}px;
      height: ${POSTER_HEIGHT}px;
      overflow: hidden;
      font-family: 'PosterSans', Inter, system-ui, -apple-system, Segoe UI, sans-serif;
      font-synthesis: none;
      background: #e9e9e9;
      color: #0f0f0f;
    }
    .poster {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #111;
    }
    .watermark {
      position: absolute;
      top: 6px;
      right: 22px;
      display: inline-flex;
      align-items: baseline;
      gap: 0;
      font-family: 'PosterInter', Inter, 'PosterSans', system-ui, -apple-system, Segoe UI, sans-serif;
      font-size: 12px;
      line-height: 1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      pointer-events: none;
      z-index: 2;
    }
    .watermark-azte {
      color: #fff;
      font-weight: 700;
    }
    .watermark-dot {
      color: #FF6B57;
      font-weight: 700;
    }
    .watermark-uno {
      color: #fff;
      font-weight: 300;
    }
    .photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(100%);
    }
    .overlay {
      position: absolute;
      inset: 22px;
      border: 5px solid #fff;
      display: grid;
      grid-template-rows: auto 1fr auto;
      padding: 24px 22px 22px;
      color: #fff;
      background: linear-gradient(to bottom, rgba(0,0,0,.15) 0%, rgba(0,0,0,.2) 45%, rgba(0,0,0,.65) 100%);
    }
    .poster-theme-color .photo {
      filter: none;
    }
    .poster-theme-lofi .photo {
      filter: sepia(.2) saturate(.82) contrast(.92) brightness(.95);
      transform: scale(1.01);
    }
    .poster-theme-lofi::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        radial-gradient(circle at 20% 16%, rgba(255, 192, 150, .12), transparent 42%),
        radial-gradient(circle at 78% 82%, rgba(38, 71, 98, .12), transparent 46%),
        radial-gradient(circle, rgba(255,255,255,.08) .7px, transparent .8px);
      background-size: auto, auto, 3px 3px;
      mix-blend-mode: soft-light;
      opacity: .35;
      z-index: 0;
    }
    .poster-theme-color .overlay {
      background: linear-gradient(to bottom, rgba(0,0,0,.2) 0%, rgba(0,0,0,.28) 45%, rgba(0,0,0,.7) 100%);
    }
    .poster-theme-lofi .overlay {
      background: linear-gradient(to bottom, rgba(0,0,0,.23) 0%, rgba(0,0,0,.34) 45%, rgba(0,0,0,.74) 100%);
      backdrop-filter: blur(1.2px);
    }
    .wave-row { display: flex; justify-content: center; align-items: center; min-height: 52px; }
    .wave-row.wave-row-real { min-height: 64px; }
    .wave-bars { display: flex; align-items: center; gap: 5px; height: 32px; }
    .wave-bars span {
      width: 5px;
      height: var(--h);
      max-height: 28px;
      border-radius: 999px;
      background: #fff;
    }
    .spotify-code-real {
      width: min(100%, 360px);
      line-height: 0;
      display: flex;
      justify-content: center;
      overflow: visible;
    }
    .spotify-code-real svg {
      width: 100% !important;
      max-width: 100%;
      height: auto !important;
      display: block;
      overflow: visible;
    }
    .meta {
      align-self: end;
      display: grid;
      gap: 10px;
    }
    .title-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: 8px;
    }
    .title {
      margin: 0;
      min-width: 0;
      font-size: 30px;
      line-height: 1.05;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .heart {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      font-size: 28px;
      line-height: 1;
      transform: translateY(-1px);
    }
    .artists { margin: 0; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .progress-bar {
      position: relative;
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: rgba(255,255,255,.5);
      overflow: visible;
    }
    .progress-fill {
      display: block;
      width: ${progressPercent}%;
      height: 100%;
      background: #fff;
    }
    .knob {
      position: absolute;
      top: 50%;
      left: ${progressPercent}%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border: 2px solid rgba(20, 20, 20, .24);
      box-shadow: 0 2px 6px rgba(0,0,0,.35);
      z-index: 2;
    }
    .time-row { margin-top: 5px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
    .controls {
      margin-top: 6px;
      display: grid;
      grid-template-columns: 1fr 1fr auto 1fr 1fr;
      align-items: center;
      column-gap: 4px;
    }
    .icon { position: relative; min-height: 36px; }
    .play {
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: #fff;
      justify-self: center;
    }
    .play::before {
      content: '';
      position: absolute;
      left: 39%;
      top: 31%;
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
      border-left: 17px solid #111;
    }
    .previous, .next { width: 48px; justify-self: center; }
    .previous::before, .next::before {
      content: '';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 11px solid transparent;
      border-bottom: 11px solid transparent;
    }
    .previous::before { border-right: 18px solid #fff; left: 16px; }
    .previous::after {
      content: '';
      position: absolute;
      left: 11px;
      top: 50%;
      width: 4px;
      height: 22px;
      background: #fff;
      transform: translateY(-50%);
    }
    .next::before { border-left: 18px solid #fff; right: 16px; }
    .next::after {
      content: '';
      position: absolute;
      right: 11px;
      top: 50%;
      width: 4px;
      height: 22px;
      background: #fff;
      transform: translateY(-50%);
    }
    .shuffle::before, .repeat::before {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 24px;
      line-height: 1;
    }
    .shuffle::before { content: '⇄'; }
    .repeat::before { content: '↺'; }
  </style>
</head>
<body>
  <article class="poster ${themeClass}">
    <img class="photo" src="${escapeHtml(model.artwork.coverUrl)}" alt="User photo" />
    <p class="watermark" aria-hidden="true"><span class="watermark-azte">AZTE</span><span class="watermark-dot">.</span><span class="watermark-uno">UNO</span></p>
    <section class="overlay">
      <div class="wave-row${model.spotifyCodeSvg ? " wave-row-real" : ""}">${renderSpotifyCode(model.spotifyCodeSvg)}</div>
      <div></div>
      <section class="meta">
        <div class="title-row"><h1 class="title">${escapeHtml(model.track.title)}</h1><span class="heart">♥</span></div>
        <p class="artists">${escapeHtml(model.track.artists)}</p>
        <div>
          <div class="progress-bar"><span class="progress-fill"></span><span class="knob"></span></div>
          <div class="time-row"><span>${escapeHtml(model.track.currentTime)}</span><span>${escapeHtml(model.track.totalTime)}</span></div>
        </div>
        <div class="controls" aria-hidden="true">
          <span class="icon shuffle"></span>
          <span class="icon previous"></span>
          <span class="icon play"></span>
          <span class="icon next"></span>
          <span class="icon repeat"></span>
        </div>
      </section>
    </section>
  </article>
</body>
</html>`;
}

module.exports = {
  id: 'minimal-clean-v1',
  displayName: 'Minimal Clean',
  description: 'Photo-based minimal poster with Spotify-like white overlay',
  defaultTheme: 'bw',
  normalizePayload,
  renderHtml,
};
