const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Add stealth plugin
chromium.use(stealth);

/**
 * Launches a browser instance with stealth capabilities.
 * @param {boolean} headless - Whether to run in headless mode.
 * @returns {Promise<import('playwright').Browser>}
 */
async function launchBrowser(headless = false) {
    return await chromium.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ]
    });
}

module.exports = { launchBrowser };
