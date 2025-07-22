import { Page. expect} from '@playwright/test';
import { loginSelectors } from '../support/testSelectors';

export default class LoginComponent {

    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    self(id?: number){
        if (id !== undefined) {
            return this.page.locator(loginSelectors.self).nth(id);
        }
        return this.page.locator(loginSelectors.self);
    }

    emailInput() {
        return this.self().locator(loginSelectors.email);
    }

    passwordInput() {
        return this.self().locator(loginSelectors.password);
    }

    loginButton() {
        return this.self().locator(loginSelectors.button);
    }

    public async login(email: string, password: string) {
        await this.emailInput().fill(email);
        await this.passwordInput().fill(password);
        await this.loginButton().click();
    }
}