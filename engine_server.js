require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { chromium } = require('playwright');
const logger = require('./functions/logger');
const BasePage = require('./pages/BasePage');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let browser;
let page;
let bot;

async function initBrowser() {
    browser = await chromium.launch({ headless: true }); // Headless so it runs on server, we stream screenshots
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    bot = new BasePage(page);
    logger.info('Browser Engine Initialized');
}

async function captureAndSend(socket) {
    if (page) {
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 50 });
        socket.emit('screen', `data:image/jpeg;base64,${screenshot.toString('base64')}`);
    }
}

io.on('connection', (socket) => {
    logger.info('Client connected to Browser Engine');

    socket.on('navigate', async (url) => {
        try {
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            await page.goto(fullUrl, { waitUntil: 'networkidle' });
            await captureAndSend(socket);
            socket.emit('bot-response', `Arrived at ${fullUrl}. What should I do next?`);
        } catch (err) {
            socket.emit('bot-response', `Error navigating: ${err.message}`);
        }
    });

    socket.on('command', async (cmd) => {
        try {
            const input = cmd.toLowerCase();

            if (input.startsWith('click')) {
                const target = cmd.replace(/click/i, '').trim();
                socket.emit('bot-response', `Attempting to click "${target}"...`);
                await bot.clickByText(target);
                await page.waitForLoadState('networkidle');
                await captureAndSend(socket);
                socket.emit('bot-response', `Clicked "${target}".`);
            }
            else if (input.startsWith('type')) {
                // Format: type text in selector OR just type text
                // Simple version: type "hello"
                const text = cmd.replace(/type/i, '').trim();
                await page.keyboard.type(text);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
                await captureAndSend(socket);
                socket.emit('bot-response', `Typed "${text}" and pressed Enter.`);
            }
            else if (input.startsWith('scroll')) {
                await page.mouse.wheel(0, 500);
                await captureAndSend(socket);
                socket.emit('bot-response', `Scrolled down.`);
            }
            else {
                socket.emit('bot-response', "I don't understand that command. Try 'click [text]', 'type [text]', or 'scroll'.");
            }
        } catch (err) {
            socket.emit('bot-response', `Execution error: ${err.message}`);
            await captureAndSend(socket);
        }
    });

    // Auto-update screen every few seconds if needed, or after events
    const interval = setInterval(() => captureAndSend(socket), 3000);

    socket.on('disconnect', () => {
        clearInterval(interval);
    });
});

const PORT = 3000;
initBrowser().then(() => {
    server.listen(PORT, () => {
        logger.info(`Browser Engine UI running at http://localhost:${PORT}`);
    });
});
