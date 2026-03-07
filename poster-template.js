const POSTER_WIDTH = 400;
const POSTER_HEIGHT = 600;
const FALLBACK_COVER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231b1b1b'/%3E%3Cstop offset='100%25' stop-color='%23363636'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='120' fill='rgba(255,255,255,0.08)'/%3E%3C/svg%3E";
const WAVE_BAR_HEIGHTS = [16, 26, 12, 34, 20, 40, 14, 46, 22, 32, 12, 38, 18, 44, 16];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeTheme(theme) {
  return theme === 'inverse' ? 'inverse' : 'dark';
}

function normalizeCoverUrl(coverUrl) {
  const normalized = String(coverUrl || '').trim();

  if (/^(https?:|data:|blob:)/i.test(normalized)) {
    return normalized;
  }

  return FALLBACK_COVER_DATA_URI;
}

function normalizePosterPayload(payload = {}) {
  const safeTrack = payload.track || {};
  const safeArtwork = payload.artwork || {};

  return {
    template: payload.template === 'spotify-player-v1' ? payload.template : 'spotify-player-v1',
    theme: normalizeTheme(payload.theme),
    track: {
      title: String(safeTrack.title || 'Unknown title'),
      artists: String(safeTrack.artists || 'Unknown artist'),
      currentTime: String(safeTrack.currentTime || '0:00'),
      totalTime: String(safeTrack.totalTime || '0:00'),
    },
    artwork: {
      coverUrl: normalizeCoverUrl(safeArtwork.coverUrl),
    },
    output: {
      width: Number(payload.output?.width) || 1000,
      format: payload.output?.format === 'png' ? 'png' : 'jpeg',
      quality: Number(payload.output?.quality) || 0.92,
    },
  };
}

function parseTimeToSeconds(timeText) {
  const match = String(timeText || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}

function resolveProgressRatio(currentTime, totalTime) {
  const current = parseTimeToSeconds(currentTime);
  const total = parseTimeToSeconds(totalTime);

  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return 0.82;
  }

  const ratio = current / total;
  return Math.max(0, Math.min(1, ratio));
}

function renderWaveBars() {
  return WAVE_BAR_HEIGHTS.map((height) => `<span style="--h:${height}px"></span>`).join('');
}

function renderPosterHtml(payload) {
  const model = normalizePosterPayload(payload);
  const themeClass = model.theme === 'inverse' ? 'poster-theme-inverse' : '';
  const progressRatio = resolveProgressRatio(model.track.currentTime, model.track.totalTime);
  const progressPercent = Math.max(0, Math.min(100, progressRatio * 100));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: ${POSTER_WIDTH}px ${POSTER_HEIGHT}px; margin: 0; }
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; overflow: hidden; font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; }
    .poster { position: relative; width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; overflow: hidden; border-radius: 0; isolation: isolate; color: #fff; }
    .background-layer { position: absolute; inset: -4%; background-image: var(--cover-image); background-size: cover; background-position: center; filter: blur(10px) saturate(0.95); transform: scale(1.08); z-index: -3; }
    .poster::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.42) 8%, rgba(0,0,0,.58) 45%, rgba(0,0,0,.9) 100%); z-index: -2; }
    .poster::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 18%, transparent 0 32%, rgba(0,0,0,.5) 72%); z-index: -1; }
    .content { height: 100%; display: grid; grid-template-rows: auto 1fr; justify-items: center; align-items: start; row-gap: 6px; padding: 12px 14px 14px; }
    .album-cover-wrap { width: 348px; height: 348px; margin: 0 0 10px; border: 4px solid #fff; overflow: hidden; }
    .album-cover { width: 100%; height: 100%; display: block; object-fit: cover; background: #fff; box-shadow: 0 6px 16px rgba(0,0,0,.3); }
    .player-overlay { width: 348px; align-self: stretch; display: grid; grid-template-rows: auto auto auto auto 1fr; }
    .player-overlay > :not(.wave-row):not(.title-row):not(.artist-row):not(.progress-wrap):not(.controls) { display: none !important; }
    .wave-row { display: flex; justify-content: center; }
    .wave-bars { display: flex; align-items: center; gap: 5px; height: 30px; }
    .wave-bars span { width: 5px; height: var(--h); max-height: 28px; background: #fff; border-radius: 999px; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
    .title-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: .35rem; margin-top: 32px; }
    .title { margin: 0; min-width: 0; font-size: 1.72rem; font-weight: 800; line-height: 1.1; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .heart { border: 0; background: transparent; color: inherit; width: 26px; height: 26px; display: inline-grid; place-items: center; font-size: 1.55rem; line-height: 1; padding: 0; }
    .artist-row { margin: .18rem 0 .2rem; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: .35rem; font-size: .82rem; font-weight: 700; color: #f3f3f3; }
    .artist-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .explicit { display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.25em; background: rgba(255,255,255,.9); color: #0f0f0f; font-size: .62em; border-radius: 6px; font-weight: 900; }
    .progress-wrap { margin-bottom: 2px; }
    .progress-bar { width: 100%; height: 8px; border-radius: 999px; background: rgba(255,255,255,.96); position: relative; }
    .progress-fill { position: absolute; inset: 0 auto 0 0; width: ${progressPercent}%; border-radius: inherit; background: rgba(255,255,255,.95); }
    .knob { position: absolute; left: ${progressPercent}%; top: 50%; width: 20px; height: 20px; border-radius: 50%; transform: translate(-50%, -50%); background: #fff; box-shadow: 0 3px 8px rgba(0,0,0,.3); }
    .time-row { margin-top: .2rem; display: flex; justify-content: space-between; font-size: .72rem; font-weight: 700; }
    .controls { align-self: end; display: grid; grid-template-columns: 1fr 1fr auto 1fr 1fr; align-items: center; column-gap: 2px; margin-top: -8px; }
    .icon { position: relative; border: 0; background: transparent; color: inherit; min-height: 38px; }
    .play { width: 72px; height: 72px; border-radius: 50%; background: #fff; justify-self: center; }
    .play::before { content: ''; position: absolute; left: 39%; top: 31%; width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 19px solid #111; }
    .previous, .next { width: 54px; justify-self: center; }
    .previous::before, .next::before { content: ''; position: absolute; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 13px solid transparent; border-bottom: 13px solid transparent; }
    .previous::before { border-right: 22px solid currentColor; left: 17px; }
    .previous::after { content: ''; position: absolute; left: 11px; top: 50%; width: 4px; height: 26px; background: currentColor; transform: translateY(-50%); }
    .next::before { border-left: 22px solid currentColor; right: 17px; }
    .next::after { content: ''; position: absolute; right: 11px; top: 50%; width: 4px; height: 26px; background: currentColor; transform: translateY(-50%); }
    .shuffle::before { content: '⇄'; font-size: 1.75rem; line-height: 1; }
    .repeat::before { content: '↺'; font-size: 1.75rem; line-height: 1; }
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
        <div class="wave-row" aria-hidden="true"><div class="wave-bars">${renderWaveBars()}</div></div>
        <div class="title-row">
          <h2 class="title">${escapeHtml(model.track.title)}</h2>
          <button class="heart" aria-label="Liked song">♥</button>
        </div>
        <p class="artist-row"><span class="explicit">E</span><span class="artist-text">${escapeHtml(model.track.artists)}</span></p>
        <div class="progress-wrap" aria-hidden="true">
          <div class="progress-bar"><span class="progress-fill"></span><span class="knob"></span></div>
          <div class="time-row"><span>${escapeHtml(model.track.currentTime)}</span><span>${escapeHtml(model.track.totalTime)}</span></div>
        </div>
        <div class="controls" aria-label="Playback controls">
          <button class="icon shuffle" aria-label="Shuffle"></button>
          <button class="icon previous" aria-label="Previous"></button>
          <button class="icon play" aria-label="Play"></button>
          <button class="icon next" aria-label="Next"></button>
          <button class="icon repeat" aria-label="Repeat"></button>
        </div>
      </section>
    </section>
  </article>
</body>
</html>`;
}

module.exports = {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  normalizePosterPayload,
  renderPosterHtml,
};
