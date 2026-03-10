const SPOTIFY_SCANNABLE_BASE_URL = 'https://scannables.scdn.co/uri/plain/svg/000000/white/640';

function buildSpotifyCodeUrl(uri) {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    throw new Error('A valid Spotify URI is required to build the Spotify Code URL.');
  }

  const normalizedUri = uri.trim();
  return `${SPOTIFY_SCANNABLE_BASE_URL}/${encodeURIComponent(normalizedUri)}`;
}

async function fetchSpotifyCodeSvg(uri) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node.js runtime.');
  }

  const url = buildSpotifyCodeUrl(uri);
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Spotify scannables request failed (${response.status}): ${errorText || 'No response body'}`);
  }

  const svgText = await response.text();
  if (!/^\s*<svg\b/i.test(svgText)) {
    throw new Error('Spotify scannables response is not a valid SVG payload.');
  }

  return svgText;
}

function getSvgDimensions(svgText) {
  const svgMatch = svgText.match(/<svg\b[^>]*>/i);
  if (!svgMatch) return null;

  const svgTag = svgMatch[0];
  const widthMatch = svgTag.match(/\bwidth\s*=\s*"([^"]+)"/i);
  const heightMatch = svgTag.match(/\bheight\s*=\s*"([^"]+)"/i);
  const viewBoxMatch = svgTag.match(/\bviewBox\s*=\s*"([^"]+)"/i);

  const parseLength = (raw) => {
    if (!raw) return null;
    if (raw.trim() === '100%') return '100%';
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  };

  let width = parseLength(widthMatch?.[1] || null);
  let height = parseLength(heightMatch?.[1] || null);
  let viewBoxWidth = null;
  let viewBoxHeight = null;

  if (viewBoxMatch) {
    const viewBoxParts = viewBoxMatch[1]
      .trim()
      .split(/\s+/)
      .map((part) => Number.parseFloat(part));

    if (viewBoxParts.length === 4 && viewBoxParts.every(Number.isFinite)) {
      viewBoxWidth = viewBoxParts[2];
      viewBoxHeight = viewBoxParts[3];
      if (width === null || width === '100%') width = viewBoxParts[2];
      if (height === null || height === '100%') height = viewBoxParts[3];
    }
  }

  return { width, height, viewBoxWidth, viewBoxHeight };
}

function parseRectAttribute(rectTag, attrName) {
  const match = rectTag.match(new RegExp(`\\b${attrName}\\s*=\\s*"([^"]+)"`, 'i'));
  return match ? match[1].trim() : null;
}

function isFullBackgroundRect(rectTag, dimensions) {
  const parseLength = (value) => {
    if (value == null) return null;
    if (value === '100%') return '100%';
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const x = parseLength(parseRectAttribute(rectTag, 'x') || '0');
  const y = parseLength(parseRectAttribute(rectTag, 'y') || '0');
  const width = parseLength(parseRectAttribute(rectTag, 'width'));
  const height = parseLength(parseRectAttribute(rectTag, 'height'));

  const isAtOrigin = (x === 0 || x === '0%' || x === null) && (y === 0 || y === '0%' || y === null);
  if (!isAtOrigin) return false;

  const matchesAnyDimension = (value, dimensionValues) => {
    if (value === '100%') return true;
    if (typeof value !== 'number') return false;

    return dimensionValues.some((dimensionValue) => typeof dimensionValue === 'number' && Math.abs(value - dimensionValue) < 0.01);
  };

  const widthIsFull = matchesAnyDimension(width, [dimensions?.width, dimensions?.viewBoxWidth]);
  const heightIsFull = matchesAnyDimension(height, [dimensions?.height, dimensions?.viewBoxHeight]);

  const fill = (parseRectAttribute(rectTag, 'fill') || '').toLowerCase();
  const style = (parseRectAttribute(rectTag, 'style') || '').toLowerCase();
  const styleFillMatch = style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
  const effectiveFill = (styleFillMatch?.[1] || fill || '').trim();
  const isDarkFill = effectiveFill === 'black'
    || effectiveFill === '#000'
    || effectiveFill === '#000000'
    || effectiveFill === 'rgb(0,0,0)'
    || effectiveFill === 'rgb(0, 0, 0)';

  return Boolean(widthIsFull && heightIsFull && isDarkFill);
}

function stripSpotifySvgBackground(svgText) {
  if (typeof svgText !== 'string' || !svgText.trim()) {
    throw new Error('A non-empty SVG string is required.');
  }

  const dimensions = getSvgDimensions(svgText);
  let removed = false;

  return svgText.replace(/<rect\b[^>]*?(?:\/>|><\/rect>)/gi, (rectTag) => {
    if (!removed && isFullBackgroundRect(rectTag, dimensions)) {
      removed = true;
      return '';
    }

    return rectTag;
  });
}

module.exports = {
  buildSpotifyCodeUrl,
  fetchSpotifyCodeSvg,
  stripSpotifySvgBackground,
};
