require('dotenv').config();
const { launchBrowser } = require('./utils/browser');
const LoginPage = require('./pages/LoginPage');
const logger = require('./functions/logger');

(async () => {
    let browser;
    try {
        logger.info('Starting Login Bot...');

        browser = await launchBrowser(false); // Set to true for background
        const context = await browser.newContext();
        const page = await context.newPage();

        const loginPage = new LoginPage(page);

        // Demo site: The Internet by SauceLabs
        const targetUrl = 'https://the-internet.herokuapp.com/login';
        const username = process.env.BOT_USERNAME || 'tomsmith';
        const password = process.env.BOT_PASSWORD || 'SuperSecretPassword!';

        logger.info(`Navigating to ${targetUrl}...`);
        await loginPage.navigate(targetUrl);

        // Update selectors for this specific demo site
        loginPage.usernameInput = '#username';
        loginPage.passwordInput = '#password';
        loginPage.loginButton = 'button[type="submit"]';

        logger.info(`Attempting login for user: ${username}`);
        await loginPage.login(username, password);

        const url = page.url();
        if (url.includes('/secure')) {
            logger.info('Login successful! Reached secure area.');
            await page.screenshot({ path: 'login_success.png' });
        } else {
            logger.warn('Login might have failed. URL: ' + url);
            await page.screenshot({ path: 'login_check_failed.png' });
        }

    } catch (error) {
        logger.error('Automation failed: ' + error.message);
    } finally {
        if (browser) {
            logger.info('Closing browser.');
            await browser.close();
        }
    }
})();
