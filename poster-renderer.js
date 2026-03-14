const { POSTER_HEIGHT, POSTER_WIDTH } = require('./templates/shared');

let chromium = null;

function loadChromium() {
  if (chromium) return chromium;

  const moduleNames = ['playwright', 'playwright-core'];
  let lastError = null;

  for (const moduleName of moduleNames) {
    try {
      const playwrightModule = require(moduleName);
      if (playwrightModule?.chromium) {
        chromium = playwrightModule.chromium;
        return chromium;
      }
    } catch (error) {
      lastError = error;
    }
  }

  const installHelp = [
    'Cannot find Playwright runtime. Install it in the poster-renderer service dependencies.',
    'Run: npm install playwright',
    'Then install browser binaries: npx playwright install chromium',
    'On minimal Linux hosts, you may also need: npx playwright install-deps chromium',
  ].join(' ');

  const error = new Error(installHelp);
  error.cause = lastError;
  throw error;
}


async function collectPageDebugData({ html }) {
  if (!html || typeof html !== 'string') {
    throw new Error('collectPageDebugData requires html as a non-empty string');
  }

  const chromiumBrowser = loadChromium();
  const browser = await chromiumBrowser.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: POSTER_WIDTH, height: POSTER_HEIGHT } });
    await page.setContent(html, { waitUntil: 'networkidle' });

    await page.waitForFunction(() => window.__MAP_READY === true || window.__MAP_FAILED === true, { timeout: 12000 }).catch(() => null);

    const debug = await page.evaluate(() => ({
      mapReady: window.__MAP_READY === true,
      mapFailed: window.__MAP_FAILED === true,
      mapError: typeof window.__MAP_ERROR === 'string' ? window.__MAP_ERROR : '',
      mapSteps: Array.isArray(window.__MAP_DEBUG) ? window.__MAP_DEBUG.map((item) => String(item)) : [],
    }));

    return debug;
  } finally {
    await browser.close();
  }
}

async function renderPosterImage({ html, output = {} }) {
  if (!html || typeof html !== 'string') {
    throw new Error('renderPosterImage requires html as a non-empty string');
  }

  const width = Math.max(200, Math.round(Number(output.width) || 1000));
  const scale = width / POSTER_WIDTH;
  const height = Math.round(POSTER_HEIGHT * scale);
  const format = output.format === 'png' ? 'png' : 'jpeg';
  const quality = format === 'jpeg' ? Math.max(0.1, Math.min(1, Number(output.quality) || 0.92)) : undefined;

  const chromiumBrowser = loadChromium();
  const browser = await chromiumBrowser.launch({ headless: true });
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

    await page.waitForFunction(() => window.__MAP_READY === true || window.__MAP_FAILED === true, { timeout: 12000 }).catch(() => null);

    const buffer = await page.screenshot({
      type: format,
      quality: quality ? Math.round(quality * 100) : undefined,
      fullPage: false,
      clip: { x: 0, y: 0, width: POSTER_WIDTH, height: POSTER_HEIGHT },
    });

    const debug = await page.evaluate(() => ({
      mapReady: window.__MAP_READY === true,
      mapFailed: window.__MAP_FAILED === true,
      mapError: typeof window.__MAP_ERROR === 'string' ? window.__MAP_ERROR : '',
      mapSteps: Array.isArray(window.__MAP_DEBUG) ? window.__MAP_DEBUG.map((item) => String(item)) : [],
    }));

    return {
      buffer,
      format,
      width,
      height,
      html,
      debug,
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  renderPosterImage,
  collectPageDebugData,
};
