const minimalCleanV1 = require('../minimal-clean-v1');

function normalizePayload(payload = {}) {
  const model = minimalCleanV1.normalizePayload(payload);
  return {
    ...model,
    template: 'minimal-reveal-v1',
  };
}

function renderHtml(model) {
  const html = minimalCleanV1.renderHtml(model);
  return html.replace(/<h1 class="title">[\s\S]*?<\/h1>/, '<h1 class="title" aria-hidden="true"></h1>');
}

module.exports = {
  id: 'minimal-reveal-v1',
  displayName: 'Minimal Reveal',
  description: 'Minimal poster base frame for text reveal video rendering',
  defaultTheme: 'bw',
  normalizePayload,
  renderHtml,
};
