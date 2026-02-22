require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./functions/logger');
const { launchBrowser } = require('./utils/browser');
const BasePage = require('./pages/BasePage');
const { formatResponse } = require('./functions/utils');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Global Playwright Session
let browser = null;
let page = null;
let bot = null;

async function ensureBrowser() {
    try {
        if (browser && !browser.isConnected()) {
            logger.warn('Browser disconnected, cleaning up...');
            browser = null;
            page = null;
            bot = null;
        }

        if (!browser) {
            // Using Persistent Context for better session handling and to look more "human"
            const userDataDir = path.join(__dirname, 'user_data');

            // launchPersistentContext returns a context directly
            const context = await chromium.launchPersistentContext(userDataDir, {
                headless: false, // HEADED MODE
                viewport: { width: 1280, height: 800 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                deviceScaleFactor: 1,
                hasTouch: false,
                locale: 'en-US',
                timezoneId: 'America/New_York',
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox'
                ]
            });

            browser = context.browser();
            page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
            bot = new BasePage(page);

            // Handle unexpected closure
            context.on('close', () => {
                logger.info('Browser context closed');
                browser = null;
                page = null;
                bot = null;
            });
        }
    } catch (err) {
        logger.error('Failed to ensure browser: ' + err.message);
        browser = null;
        throw err;
    }
    return { browser, page, bot };
}

// API Routes
app.post('/api/navigate', async (req, res) => {
    try {
        const { url } = req.body;
        let { page, bot } = await ensureBrowser();
        try {
            await page.goto(url.startsWith('http') ? url : `https://${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            if (e.message.includes('closed')) {
                const fresh = await ensureBrowser();
                await fresh.page.goto(url.startsWith('http') ? url : `https://${url}`, { waitUntil: 'domcontentloaded' });
            } else {
                throw e;
            }
        }

        // Proactive analysis after navigation
        const state = await bot.analyzeState();
        res.json(formatResponse(true, `Navigated to ${url}`, { state }));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

app.get('/api/analyze', async (req, res) => {
    try {
        const { bot } = await ensureBrowser();
        const state = await bot.analyzeState();
        res.json(formatResponse(true, 'Analysis complete', state));
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

app.post('/api/command', async (req, res) => {
    const executeCommand = async (currentBot, currentPage, cmd) => {
        const lowCommand = cmd.toLowerCase();

        // 1. Known action: Click
        if (lowCommand.startsWith('click ')) {
            const target = cmd.substring(6);
            await currentBot.clickByText(target);
            return `Clicked "${target}"`;
        }

        // 2. Known action: Type
        if (lowCommand.startsWith('type ')) {
            const parts = cmd.substring(5).split(' ');
            const query = parts[0];
            const value = parts.slice(1).join(' ');
            const locator = currentPage.getByPlaceholder(query, { exact: false })
                .or(currentPage.getByLabel(query, { exact: false }))
                .or(currentPage.locator(`input[name*="${query}"]`))
                .or(currentPage.locator(`input[id*="${query}"]`));
            await locator.first().fill(value);
            return `Typed into "${query}"`;
        }

        // 3. Smart Detection: Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+([-+.][^\s@]+)*$/;
        if (emailRegex.test(cmd.trim())) {
            const emailField = currentPage.locator('input[type="email"], input[name*="email"], input[name="identifier"], input[placeholder*="email"], input[aria-label*="email"]').first();

            try {
                await emailField.waitFor({ state: 'visible', timeout: 5000 });
                await emailField.fill(cmd.trim());
                await currentPage.keyboard.press('Enter');
                return `Detected email. Typed into the field and submitted!`;
            } catch (e) {
                return `I detected an email, but couldn't find a visible field to type it into. Try clicking "Sign In" first.`;
            }
        }

        // 4. Keyboard
        if (lowCommand === 'enter' || lowCommand === 'press enter') {
            await currentPage.keyboard.press('Enter');
            return 'Pressed Enter';
        }

        // 5. Search
        if (lowCommand.startsWith('search ')) {
            await currentPage.goto(`https://www.google.com/search?q=${encodeURIComponent(cmd.substring(7))}`);
            return `Searching for "${cmd.substring(7)}"`;
        }

        // 6. Natural Language / Default
        try {
            // Try to find a field to type into if it's not a button
            const inputField = currentPage.locator('input:visible').first();
            const isButton = await currentPage.getByRole('button', { name: cmd, exact: false }).isVisible().catch(() => false);

            if (!isButton && await inputField.isVisible()) {
                await inputField.fill(cmd);
                await currentPage.keyboard.press('Enter');
                return `Found an input field. Typed "${cmd}" and submitted.`;
            }

            await currentBot.clickByText(cmd);
            return `Interpreted as: Click "${cmd}"`;
        } catch (e) {
            return `I'm not sure what to do with "${cmd}". Try "click [button]" or "type [text]".`;
        }
    };

    try {
        const { command } = req.body;
        let { bot, page } = await ensureBrowser();
        try {
            const msg = await executeCommand(bot, page, command);
            const state = await bot.analyzeState();
            res.json(formatResponse(true, msg, { state }));
        } catch (e) {
            if (e.message.includes('closed')) {
                const fresh = await ensureBrowser();
                const msg = await executeCommand(fresh.bot, fresh.page, command);
                const state = await fresh.bot.analyzeState();
                res.json(formatResponse(true, msg, { state }));
            } else {
                throw e;
            }
        }
    } catch (error) {
        res.status(500).json(formatResponse(false, error.message));
    }
});

app.get('/api/screenshot', async (req, res) => {
    try {
        const { page } = await ensureBrowser();
        const screenshot = await page.screenshot({ type: 'png' });
        res.contentType('image/png');
        res.send(screenshot);
    } catch (error) {
        res.status(500).send('No browser active');
    }
});

app.get('/api/status', async (req, res) => {
    const { page } = await ensureBrowser();
    res.json({
        url: page.url(),
        title: await page.title()
    });
});

// Serve frontend in production (optional for now as we run dev separately)
// app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Error handling
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send(formatResponse(false, 'Internal server error'));
});

app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
});
