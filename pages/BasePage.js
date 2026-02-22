/**
 * Base Page for common browser interactions
 */
class BasePage {
    /**
     * @param {import('playwright').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Analyzes the page to see what's happening (e.g., if we need to login)
     */
    async analyzeState() {
        const result = {
            needsLogin: false,
            hasEmailField: false,
            hasPasswordField: false,
            loginButtons: [],
            title: await this.page.title(),
            currentUrl: this.page.url()
        };

        // Check for common login buttons
        const loginTexts = ['Sign in', 'Log in', 'Login', 'Get Started', 'Next', 'Go to console', 'Continue'];
        for (const text of loginTexts) {
            const locator = this.page.getByRole('button', { name: text, exact: false })
                .or(this.page.getByText(text, { exact: false }))
                .or(this.page.getByRole('link', { name: text, exact: false }));
            if (await locator.first().isVisible().catch(() => false)) {
                result.loginButtons.push(text);
            }
        }

        // Check for input fields
        result.hasEmailField = await this.page.locator('input[type="email"], input[name*="email"], input[name="identifier"], [aria-label*="Email"]').first().isVisible().catch(() => false);
        result.hasPasswordField = await this.page.locator('input[type="password"]').first().isVisible().catch(() => false);

        if (result.hasEmailField || result.loginButtons.length > 0) {
            result.needsLogin = true;
        }

        return result;
    }

    async clickByText(text) {
        // Human-like delay
        await this.page.waitForTimeout(500);

        // First, check if there's an input field we should be typing into instead
        // if the text looks like an email but we're in "click" mode.
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(text.trim())) {
            const field = this.page.locator('input[type="email"], input[name*="email"], input[name="identifier"]').first();
            if (await field.isVisible().catch(() => false)) {
                await field.fill(text.trim());
                await this.page.keyboard.press('Enter');
                return;
            }
        }

        // 1. Try main page with a strict internal timeout
        const locator = this.page.getByRole('button', { name: text, exact: false })
            .or(this.page.getByText(text, { exact: false }))
            .or(this.page.getByRole('link', { name: text, exact: false }));

        try {
            await locator.first().waitFor({ state: 'visible', timeout: 5000 });
            await locator.first().scrollIntoViewIfNeeded({ timeout: 2000 });
            await locator.first().click({ timeout: 2000 });
            return;
        } catch (e) {
            // 2. Search in iframes
            const frames = this.page.frames();
            for (const frame of frames) {
                const frameLocator = frame.getByRole('button', { name: text, exact: false })
                    .or(frame.getByText(text, { exact: false }))
                    .or(frame.getByRole('link', { name: text, exact: false }));
                try {
                    await frameLocator.first().waitFor({ state: 'visible', timeout: 1000 });
                    await frameLocator.first().click({ timeout: 1000 });
                    return;
                } catch (innerE) {
                    continue;
                }
            }
            throw new Error(`Could not find "${text}" after 5 seconds.`);
        }
    }

    /**
     * Scrolls the page until an element is visible
     * @param {string} selector 
     */
    async scrollToElement(selector) {
        const locator = this.page.locator(selector);
        await locator.scrollIntoViewIfNeeded();
    }

    /**
     * Generic "Wait and Click" that understands dynamic loading
     * @param {string} selector 
     */
    async smartClick(selector) {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible' });
        await locator.scrollIntoViewIfNeeded();
        await locator.click();
    }
}

module.exports = BasePage;
