/**
 * Page Object for Login
 */
class LoginPage {
    /**
     * @param {import('playwright').Page} page
     */
    constructor(page) {
        this.page = page;
        this.usernameInput = 'input[name="username"]'; // Update selectors as needed
        this.passwordInput = 'input[name="password"]';
        this.loginButton = 'button[type="submit"]';
    }

    async navigate(url) {
        await this.page.goto(url);
    }

    async login(username, password) {
        await this.page.locator(this.usernameInput).fill(username);
        await this.page.locator(this.passwordInput).fill(password);
        await this.page.locator(this.loginButton).click();
        await this.page.waitForLoadState('networkidle');
    }

    async getErrorMessage() {
        // Example for error handling
        return await this.page.locator('.error-message').textContent();
    }
}

module.exports = LoginPage;
