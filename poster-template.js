const POSTER_WIDTH = 400;
const POSTER_HEIGHT = 600;

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
      coverUrl: String(safeArtwork.coverUrl || ''),
    },
    output: {
      width: Number(payload.output?.width) || 1000,
      format: payload.output?.format === 'png' ? 'png' : 'jpeg',
      quality: Number(payload.output?.quality) || 0.92,
    },
  };
}

function renderPosterHtml(payload) {
  const model = normalizePosterPayload(payload);
  const themeClass = model.theme === 'inverse' ? 'poster-theme-inverse' : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; overflow: hidden; font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; }
    .poster { position: relative; width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; background: #000; color: #fff; overflow: hidden; }
    .poster-theme-inverse { background: #f8f6f1; color: #111; }
    .background-layer { position: absolute; inset: 0; background-image: var(--cover-image); background-size: cover; background-position: center; filter: blur(18px) saturate(1.1); transform: scale(1.08); opacity: .5; }
    .background-layer::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.78)); }
    .poster-theme-inverse .background-layer::after { background: linear-gradient(180deg, rgba(248,246,241,.45), rgba(248,246,241,.82)); }
    .content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; padding: 24px; gap: 18px; }
    .album-cover { width: 100%; aspect-ratio: 1 / 1; border-radius: 14px; object-fit: cover; box-shadow: 0 20px 35px rgba(0,0,0,.35); }
    .player { margin-top: auto; background: rgba(20,20,20,.66); backdrop-filter: blur(6px); border-radius: 20px; padding: 16px; }
    .poster-theme-inverse .player { background: rgba(255,255,255,.72); }
    .title { margin: 8px 0 0; font-size: 22px; line-height: 1.2; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .artists { margin: 8px 0 12px; font-size: 14px; line-height: 1.3; opacity: .9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .times { display: flex; justify-content: space-between; font-size: 12px; opacity: .8; }
    .progress { margin-top: 8px; width: 100%; height: 4px; border-radius: 999px; background: rgba(255,255,255,.25); }
    .poster-theme-inverse .progress { background: rgba(0,0,0,.2); }
    .progress > span { display: block; width: 72%; height: 100%; border-radius: inherit; background: currentColor; }
    .controls { margin-top: 12px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .controls span { display: block; height: 9px; border-radius: 999px; background: currentColor; opacity: .7; }
  </style>
</head>
<body>
  <article class="poster ${themeClass}">
    <div class="background-layer" style="--cover-image:url('${escapeHtml(model.artwork.coverUrl)}')"></div>
    <section class="content">
      <img class="album-cover" src="${escapeHtml(model.artwork.coverUrl)}" alt="Album cover" />
      <section class="player">
        <h2 class="title">${escapeHtml(model.track.title)}</h2>
        <p class="artists">${escapeHtml(model.track.artists)}</p>
        <div class="progress"><span></span></div>
        <div class="times"><span>${escapeHtml(model.track.currentTime)}</span><span>${escapeHtml(model.track.totalTime)}</span></div>
        <div class="controls"><span></span><span></span><span></span><span></span><span></span></div>
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
