const spotifyPlayerV1 = require('./spotify-player-v1');
const minimalCleanV1 = require('./minimal-clean-v1');
const mapMessageV1 = require('./map-message-v1');
const minimalRevealV1 = require('./minimal-reveal-v1');

const templates = [spotifyPlayerV1, minimalCleanV1, minimalRevealV1, mapMessageV1];

const templateMap = new Map(templates.map((template) => [template.id, template]));

function getTemplateById(templateId) {
  return templateMap.get(templateId) || null;
}

function listTemplates() {
  return templates.map((template) => ({
    id: template.id,
    name: template.displayName,
    description: template.description,
  }));
}

module.exports = {
  DEFAULT_TEMPLATE_ID: 'spotify-player-v1',
  getTemplateById,
  listTemplates,
};
