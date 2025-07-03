import { test as base } from '@playwright/test';
import BasePage from './pages/base.page';
import SignUpLoginPage from './pages/signUpLogin.page';

export const test = base.extend<{
    gdpr: ReturnType<BasePage['gdprConsent']>;
    mainMenu: ReturnType<BasePage['mainMenu']>;
    login: ReturnType<SignUpLoginPage['loginComponent']>;
    basePage: BasePage;
    signUpLoginPage: SignUpLoginPage;

}>({
    signUpLoginPage: async ({ page }, use) => {
        const signUpLoginPage = new SignUpLoginPage(page);
        await use(signUpLoginPage);
    },
    basePage: async ({ page }, use) => {
        const basePage = new BasePage(page);
        await use(basePage);
    },

    gdpr: async ({ page }, use) => {
        const gdpr = new BasePage(page).gdprConsent();
        await use(gdpr);
    },

    mainMenu: async ({ page }, use) => {
        const mainMenu = new BasePage(page).mainMenu();
        await use(mainMenu);
    },

    login: async ({ page }, use) => {
        const loginComponent = new SignUpLoginPage(page).loginComponent();
        await use(loginComponent);
    }
});