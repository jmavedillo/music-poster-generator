const { getTemplateById, listTemplates, DEFAULT_TEMPLATE_ID } = require('./templates/registry');
const { fetchSpotifyCodeSvg, stripSpotifySvgBackground } = require('./spotify-code');

class PosterPayloadError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PosterPayloadError';
    this.code = 'POSTER_PAYLOAD_INVALID';
    this.statusCode = 400;
    this.details = details;
  }
}

function resolveTemplateId(payload = {}) {
  const requestedTemplate = payload.template;

  if (requestedTemplate === undefined || requestedTemplate === null || String(requestedTemplate).trim() === '') {
    return DEFAULT_TEMPLATE_ID;
  }

  return String(requestedTemplate).trim();
}

function resolveTemplate(payload = {}) {
  const templateId = resolveTemplateId(payload);
  const template = getTemplateById(templateId);

  if (!template) {
    throw new PosterPayloadError('Unknown poster template', {
      template: templateId,
      availableTemplates: listTemplates().map((item) => item.id),
    });
  }

  return template;
}

async function resolveSpotifyCodeSvg(uri) {
  if (!uri) {
    return null;
  }

  try {
    const spotifyCodeSvg = await fetchSpotifyCodeSvg(uri);
    return stripSpotifySvgBackground(spotifyCodeSvg);
  } catch (error) {
    console.warn(`[poster-service] spotifyCodeSvg unavailable for uri "${uri}": ${error.message}`);
    return null;
  }
}

async function buildPoster(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PosterPayloadError('Poster payload must be a JSON object');
  }

  const requestedTemplateId = resolveTemplateId(payload);
  const template = resolveTemplate({ template: requestedTemplateId });
  const model = template.normalizePayload(payload);
  model.spotifyCodeSvg = await resolveSpotifyCodeSvg(model.track?.uri);
  const html = template.renderHtml(model);

  if (!html || typeof html !== 'string') {
    throw new PosterPayloadError('Poster template produced invalid HTML output', {
      template: template.id,
    });
  }

  return {
    template,
    templateId: requestedTemplateId,
    model,
    html,
  };
}

module.exports = {
  PosterPayloadError,
  buildPoster,
  resolveTemplate,
  resolveTemplateId,
  listTemplates,
};
