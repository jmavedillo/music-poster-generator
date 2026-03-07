const { chromium } = require('playwright');
const { POSTER_HEIGHT, POSTER_WIDTH, renderPosterHtml } = require('./poster-template');

async function renderPosterImage(payload) {
  const html = renderPosterHtml(payload);
  const width = Math.max(200, Math.round(Number(payload?.output?.width) || 1000));
  const scale = width / POSTER_WIDTH;
  const height = Math.round(POSTER_HEIGHT * scale);
  const format = payload?.output?.format === 'png' ? 'png' : 'jpeg';
  const quality = format === 'jpeg' ? Math.max(0.1, Math.min(1, Number(payload?.output?.quality) || 0.92)) : undefined;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: POSTER_WIDTH, height: POSTER_HEIGHT },
      deviceScaleFactor: Math.max(1, scale),
    });

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const images = Array.from(document.images || []);
      await Promise.all(
        images.map(
          (image) =>
            new Promise((resolve) => {
              if (image.complete) return resolve();
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            })
        )
      );
    });

    const buffer = await page.screenshot({
      type: format,
      quality: quality ? Math.round(quality * 100) : undefined,
      fullPage: false,
      clip: { x: 0, y: 0, width: POSTER_WIDTH, height: POSTER_HEIGHT },
    });

    return {
      buffer,
      format,
      width,
      height,
      html,
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  renderPosterImage,
};
