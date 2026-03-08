const { getTemplateById, listTemplates, DEFAULT_TEMPLATE_ID } = require('./templates/registry');

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

function buildPoster(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PosterPayloadError('Poster payload must be a JSON object');
  }

  const template = resolveTemplate(payload);
  const model = template.normalizePayload(payload);
  const html = template.renderHtml(model);

  if (!html || typeof html !== 'string') {
    throw new PosterPayloadError('Poster template produced invalid HTML output', {
      template: template.id,
    });
  }

  return {
    template,
    templateId: template.id,
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
