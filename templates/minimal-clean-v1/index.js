const { POSTER_HEIGHT, POSTER_WIDTH, escapeHtml, normalizeCommonPayload, resolveProgressRatio } = require('../shared');

function normalizePayload(payload) {
  return normalizeCommonPayload(payload, { templateId: 'minimal-clean-v1' });
}

function renderHtml(model) {
  const isInverse = model.theme === 'inverse';
  const progressPercent = Math.round(resolveProgressRatio(model.track.currentTime, model.track.totalTime) * 100);
  const title = escapeHtml(model.track.title);
  const artists = escapeHtml(model.track.artists);
  const albumMeta = [model.track.album, model.track.year].filter(Boolean).map(escapeHtml).join(' · ');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: ${POSTER_WIDTH}px ${POSTER_HEIGHT}px; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${POSTER_WIDTH}px;
      height: ${POSTER_HEIGHT}px;
      font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
      color: ${isInverse ? '#0f172a' : '#f8fafc'};
      background: ${isInverse ? '#f8fafc' : '#09090b'};
    }
    .poster {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: 260px 1fr;
    }
    .cover {
      width: 100%;
      height: 260px;
      object-fit: cover;
      display: block;
    }
    .content {
      padding: 22px 24px;
      display: grid;
      gap: 18px;
      align-content: start;
    }
    .eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .18em;
      opacity: 0.7;
      margin: 0;
    }
    .title {
      margin: 0;
      font-size: 34px;
      line-height: 1.05;
      letter-spacing: -0.02em;
    }
    .artists {
      margin: 0;
      font-size: 16px;
      opacity: 0.88;
    }
    .album-meta {
      margin: -6px 0 0;
      font-size: 13px;
      opacity: 0.6;
      min-height: 1em;
    }
    .progress-track {
      height: 4px;
      background: ${isInverse ? 'rgba(15, 23, 42, 0.16)' : 'rgba(248, 250, 252, 0.22)'};
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-track > span {
      display: block;
      width: ${progressPercent}%;
      height: 100%;
      background: ${isInverse ? '#0f172a' : '#f8fafc'};
    }
    .times {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      opacity: 0.72;
      margin-top: -8px;
    }
    .badge {
      margin-top: 10px;
      font-size: 11px;
      letter-spacing: .16em;
      text-transform: uppercase;
      opacity: 0.68;
    }
  </style>
</head>
<body>
  <article class="poster">
    <img class="cover" src="${escapeHtml(model.artwork.coverUrl)}" alt="Album cover" />
    <section class="content">
      <p class="eyebrow">Minimal Clean</p>
      <h1 class="title">${title}</h1>
      <p class="artists">${artists}</p>
      <p class="album-meta">${albumMeta || '&nbsp;'}</p>
      <div class="progress-track" aria-hidden="true"><span></span></div>
      <div class="times"><span>${escapeHtml(model.track.currentTime)}</span><span>${escapeHtml(model.track.totalTime)}</span></div>
      <p class="badge">${escapeHtml(model.template)}</p>
    </section>
  </article>
</body>
</html>`;
}

module.exports = {
  id: 'minimal-clean-v1',
  displayName: 'Minimal Clean',
  description: 'Minimal alternative poster',
  defaultTheme: 'dark',
  normalizePayload,
  renderHtml,
};
