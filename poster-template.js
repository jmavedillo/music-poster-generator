const { buildPoster } = require('./poster-service');
const { POSTER_HEIGHT, POSTER_WIDTH } = require('./templates/shared');

function normalizePosterPayload(payload = {}) {
  return buildPoster(payload).model;
}

function renderPosterHtml(payload = {}) {
  return buildPoster(payload).html;
}

module.exports = {
  POSTER_HEIGHT,
  POSTER_WIDTH,
  normalizePosterPayload,
  renderPosterHtml,
};
