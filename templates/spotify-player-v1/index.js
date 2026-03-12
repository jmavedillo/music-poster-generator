const {
  POSTER_HEIGHT,
  POSTER_WIDTH,
  escapeHtml,
  normalizeCommonPayload,
  resolveProgressRatio,
} = require('../shared');

const fs = require('node:fs');
const path = require('node:path');

const POSTER_SANS_REGULAR_PATH = path.join(__dirname, '../../assets/fonts/DejaVuSans-Regular.ttf');
const POSTER_SANS_BOLD_PATH = path.join(__dirname, '../../assets/fonts/DejaVuSans-Bold.ttf');

function buildFontFace(fontPath, weight) {
  if (!fs.existsSync(fontPath)) {
    return '';
  }

  const fontBase64 = fs.readFileSync(fontPath).toString('base64');
  return `@font-face { font-family: 'PosterSans'; src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype'); font-weight: ${weight}; font-style: normal; font-display: block; }`;
}

const FONT_FACE_CSS = [buildFontFace(POSTER_SANS_REGULAR_PATH, '400'), buildFontFace(POSTER_SANS_BOLD_PATH, '700 900')]
  .filter(Boolean)
  .join('\n    ');

const WAVE_BAR_HEIGHTS = [16, 26, 12, 34, 20, 40, 14, 46, 22, 32, 12, 38, 18, 44, 16];

function renderWaveBars() {
  return WAVE_BAR_HEIGHTS.map((height) => `<span style="--h:${height}px"></span>`).join('');
}

function renderSpotifyCode(spotifyCodeSvg) {
  if (!spotifyCodeSvg) {
    return `<div class="wave-bars">${renderWaveBars()}</div>`;
  }

  return `<!-- spotify-code-svg:real --><div class="spotify-code-real">${spotifyCodeSvg}</div>`;
}

function renderIcon(type) {
  const iconMap = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    shuffle:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17 3h4v4h-2V6.41l-4.29 4.3-1.42-1.42L17.59 5H17V3zM3 7h3.59l6.7 6.71-1.42 1.42L5.41 9H3V7zm14 10h.59l-4.3-4.29 1.42-1.42 4.3 4.3V15h2v4h-4v-2zM3 15h2.41l2.83-2.83 1.42 1.42L6.59 17H3v-2z"/></svg>',
    repeat:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17 17H7v-2h10V12l4 4-4 4v-3zM7 7h10V4l4 4-4 4V9H7v2L3 7l4-4v4z"/></svg>',
  };

  return iconMap[type] || '';
}

function stripLegacySpotifyCodeMarkup(html) {
  return String(html || '')
    .replace(/\s*\.spotify-code\s*\{[^}]*\}\s*/g, '\n')
    .replace(/\s*\.spotify-code\s+span\s*\{[^}]*\}\s*/g, '\n')
    .replace(/\s*\.poster-theme-inverse\s+\.spotify-code\s*\{[^}]*\}\s*/g, '\n')
    .replace(/\s*\.poster-theme-inverse\s+\.spotify-code\s+span\s*\{[^}]*\}\s*/g, '\n')
    .replace(/\s*<div class="spotify-code"[^>]*>[\s\S]*?<\/div>\s*/g, '\n');
}

function normalizePayload(payload) {
  return normalizeCommonPayload(payload, { templateId: 'spotify-player-v1' });
}

function renderHtml(model) {
  const themeClass = model.theme === 'inverse' ? 'poster-theme-inverse' : '';
  const progressRatio = resolveProgressRatio(model.track.currentTime, model.track.totalTime);
  const progressPercent = Math.max(0, Math.min(100, progressRatio * 100));

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: ${POSTER_WIDTH}px ${POSTER_HEIGHT}px; margin: 0; }
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    ${FONT_FACE_CSS}
    body { width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; overflow: hidden; font-family: 'PosterSans', Arial, Helvetica, sans-serif; font-synthesis: none; }
    .poster { position: relative; width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; overflow: hidden; border-radius: 0; isolation: isolate; color: #fff; }
    .background-layer { position: absolute; inset: -4%; background-image: var(--cover-image); background-size: cover; background-position: center; filter: blur(10px) saturate(0.95); transform: scale(1.08); z-index: -3; }
    .poster::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.42) 8%, rgba(0,0,0,.58) 45%, rgba(0,0,0,.9) 100%); z-index: -2; }
    .poster::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 18%, transparent 0 32%, rgba(0,0,0,.5) 72%); z-index: -1; }
    .content { height: 100%; display: grid; grid-template-rows: auto 1fr; justify-items: center; align-items: start; row-gap: 4px; padding: 12px 14px 14px; }
    .album-cover-wrap { width: 348px; height: 348px; margin: 0 0 6px; border: 4px solid #fff; overflow: hidden; }
    .album-cover { width: 100%; height: 100%; display: block; object-fit: cover; background: #fff; box-shadow: 0 6px 16px rgba(0,0,0,.3); }
    .player-overlay { width: 348px; align-self: stretch; display: grid; grid-template-rows: auto auto auto auto 1fr; }
    .wave-row { display: flex; justify-content: center; align-items: center; min-height: 30px; }
    .wave-bars { display: flex; align-items: center; gap: 5px; height: 30px; }
    .wave-bars span { width: 5px; height: var(--h); max-height: 28px; background: #fff; border-radius: 999px; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
    .spotify-code-real { width: 100%; max-width: 190px; line-height: 0; display: flex; justify-content: center; overflow: visible; }
    .spotify-code-real svg { width: 100% !important; max-width: 100%; height: auto !important; display: block; overflow: visible; }
    .title-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: .35rem; margin-top: 24px; }
    .title { margin: 0; min-width: 0; font-size: 1.72rem; font-weight: 800; line-height: 1.1; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .heart { border: 0; background: transparent; color: inherit; width: 26px; height: 26px; display: inline-grid; place-items: center; line-height: 1; padding: 0; }
    .heart svg { width: 24px; height: 24px; display: block; }
    .artist-row { margin: .18rem 0 .2rem; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: .35rem; font-size: .82rem; font-weight: 700; color: #f3f3f3; }
    .artist-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .explicit { display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.25em; background: rgba(255,255,255,.9); color: #0f0f0f; font-size: .62em; border-radius: 6px; font-weight: 900; }
    .progress-wrap { margin-bottom: 2px; }
    .progress-bar { width: 100%; height: 8px; border-radius: 999px; background: rgba(255,255,255,.96); position: relative; }
    .progress-fill { position: absolute; inset: 0 auto 0 0; width: ${progressPercent}%; border-radius: inherit; background: rgba(255,255,255,.95); }
    .knob { position: absolute; left: ${progressPercent}%; top: 50%; width: 20px; height: 20px; border-radius: 50%; transform: translate(-50%, -50%); background: #fff; box-shadow: 0 3px 8px rgba(0,0,0,.3); }
    .time-row { margin-top: .2rem; display: flex; justify-content: space-between; font-size: .72rem; font-weight: 700; }
    .controls { align-self: end; display: grid; grid-template-columns: 1fr 1fr auto 1fr 1fr; align-items: center; column-gap: 2px; margin-top: -8px; }
    .icon { position: relative; border: 0; background: transparent; color: inherit; min-height: 38px; display: inline-grid; place-items: center; }
    .icon svg { width: 28px; height: 28px; display: block; }
    .play { width: 72px; height: 72px; border-radius: 50%; background: #fff; justify-self: center; }
    .play::before { content: ''; position: absolute; left: 39%; top: 31%; width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 19px solid #111; }
    .previous, .next { width: 54px; justify-self: center; }
    .previous::before, .next::before { content: ''; position: absolute; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 13px solid transparent; border-bottom: 13px solid transparent; }
    .previous::before { border-right: 22px solid currentColor; left: 17px; }
    .previous::after { content: ''; position: absolute; left: 11px; top: 50%; width: 4px; height: 26px; background: currentColor; transform: translateY(-50%); }
    .next::before { border-left: 22px solid currentColor; right: 17px; }
    .next::after { content: ''; position: absolute; right: 11px; top: 50%; width: 4px; height: 26px; background: currentColor; transform: translateY(-50%); }
    .shuffle svg, .repeat svg { width: 30px; height: 30px; }
    .poster-theme-inverse { color: #1f1f1f; }
    .poster-theme-inverse::before { background: linear-gradient(to bottom, rgba(255,255,255,.3) 8%, rgba(255,255,255,.5) 45%, rgba(255,255,255,.85) 100%); }
    .poster-theme-inverse::after { background: radial-gradient(circle at 50% 18%, transparent 0 32%, rgba(255,255,255,.35) 72%); }
    .poster-theme-inverse .album-cover-wrap { border-color: #2f2f2f; }
    .poster-theme-inverse .wave-bars span { background: #2f2f2f; box-shadow: 0 0 0 1px rgba(0,0,0,.08); }
    .poster-theme-inverse .artist-row { color: #2f2f2f; }
    .poster-theme-inverse .explicit { background: rgba(40,40,40,.95); color: #f6f6f6; }
    .poster-theme-inverse .progress-bar, .poster-theme-inverse .progress-fill, .poster-theme-inverse .knob, .poster-theme-inverse .play { background: #2f2f2f; }
    .poster-theme-inverse .play::before { border-left-color: #f4f4f4; }
  </style>
</head>
<body>
  <article class="poster ${themeClass}">
    <div class="background-layer" style="--cover-image:url('${escapeHtml(model.artwork.coverUrl)}')"></div>
    <section class="content">
      <figure class="album-cover-wrap">
        <img class="album-cover" src="${escapeHtml(model.artwork.coverUrl)}" alt="Album cover" />
      </figure>
      <section class="player-overlay">
        <div class="wave-row" aria-hidden="true">${renderSpotifyCode(model.spotifyCodeSvg)}</div>
        <div class="title-row">
          <h2 class="title">${escapeHtml(model.track.title)}</h2>
          <button class="heart" aria-label="Liked song">${renderIcon('heart')}</button>
        </div>
        <p class="artist-row"><span class="explicit">E</span><span class="artist-text">${escapeHtml(model.track.artists)}</span></p>
        <div class="progress-wrap" aria-hidden="true">
          <div class="progress-bar"><span class="progress-fill"></span><span class="knob"></span></div>
          <div class="time-row"><span>${escapeHtml(model.track.currentTime)}</span><span>${escapeHtml(model.track.totalTime)}</span></div>
        </div>
        <div class="controls" aria-label="Playback controls">
          <button class="icon shuffle" aria-label="Shuffle">${renderIcon('shuffle')}</button>
          <button class="icon previous" aria-label="Previous"></button>
          <button class="icon play" aria-label="Play"></button>
          <button class="icon next" aria-label="Next"></button>
          <button class="icon repeat" aria-label="Repeat">${renderIcon('repeat')}</button>
        </div>
      </section>
    </section>
  </article>
</body>
</html>`;

  return stripLegacySpotifyCodeMarkup(html);
}

module.exports = {
  id: 'spotify-player-v1',
  displayName: 'Spotify Player',
  description: 'Original player-style poster',
  defaultTheme: 'dark',
  normalizePayload,
  renderHtml,
};
