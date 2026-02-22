require('dotenv').config();
const { launchBrowser } = require('./utils/browser');
const BasePage = require('./pages/BasePage');
const logger = require('./functions/logger');

(async () => {
    let browser;
    try {
        logger.info('Starting Intelligent Bot...');

        browser = await launchBrowser(false);
        const context = await browser.newContext();
        const page = await context.newPage();
        const bot = new BasePage(page);

        // Target: A page with scrolling content
        const url = 'https://playwright.dev/';
        logger.info(`Navigating to ${url}...`);
        await page.goto(url);

        // 1. "Understand" the page by finding a specific feature link deep down
        const targetText = 'Community';
        logger.info(`Looking for "${targetText}" link...`);

        // This will automatically scroll to the element before clicking
        await bot.clickByText(targetText);

        logger.info(`Successfully clicked "${targetText}"`);
        logger.info(`Current URL: ${page.url()}`);

        // 2. Perform another smart search on the new page
        const subTarget = 'GitHub';
        logger.info(`Looking for "${subTarget}"...`);
        await bot.clickByText(subTarget);

        logger.info('Process complete. Taking screenshot...');
        await page.screenshot({ path: 'smart_bot_result.png' });

    } catch (error) {
        logger.error('Smart Bot failed: ' + error.message);
    } finally {
        if (browser) {
            logger.info('Closing browser.');
            await browser.close();
        }
    }
})();
