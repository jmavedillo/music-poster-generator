const POSTER_WIDTH = 400;
const POSTER_HEIGHT = 600;

const FALLBACK_COVER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231b1b1b'/%3E%3Cstop offset='100%25' stop-color='%23363636'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='120' fill='rgba(255,255,255,0.08)'/%3E%3C/svg%3E";

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

function normalizeOutput(output = {}) {
  const width = Number(output.width);
  const quality = Number(output.quality);

  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1000,
    format: output.format === 'png' ? 'png' : 'jpeg',
    quality: Number.isFinite(quality) ? quality : 0.92,
  };
}

function normalizeCommonPayload(payload = {}, options = {}) {
  const safeTrack = payload.track || {};
  const safeArtwork = payload.artwork || {};

  return {
    template: options.templateId,
    theme: normalizeTheme(payload.theme),
    track: {
      title: String(safeTrack.title || 'Unknown title'),
      artists: String(safeTrack.artists || 'Unknown artist'),
      currentTime: String(safeTrack.currentTime || '0:00'),
      totalTime: String(safeTrack.totalTime || '0:00'),
      album: String(safeTrack.album || ''),
      year: String(safeTrack.year || ''),
      spotifyUrl: String(safeTrack.spotifyUrl || ''),
    },
    artwork: {
      coverUrl: normalizeCoverUrl(safeArtwork.coverUrl),
      accentColor: String(safeArtwork.accentColor || ''),
    },
    output: normalizeOutput(payload.output),
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

module.exports = {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  escapeHtml,
  normalizeTheme,
  normalizeCoverUrl,
  normalizeCommonPayload,
  parseTimeToSeconds,
  resolveProgressRatio,
};
