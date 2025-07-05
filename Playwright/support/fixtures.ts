import { test as base } from '@playwright/test';
import BasePage from '../pages/base.page';
import SignUpLoginPage from '../pages/signUpLogin.page';
import CartPage from '../pages/cart.page';

export const test = base.extend<{
    gdpr: ReturnType<BasePage['gdprConsent']>;
    mainMenu: ReturnType<BasePage['mainMenu']>;
    loginForm: ReturnType<SignUpLoginPage['loginComponent']>;
    basePage: BasePage;
    signUpLoginPage: SignUpLoginPage;
    featureItems: ReturnType<BasePage['featureitems']>;
    cartPage: CartPage;

}>({
    cartPage: async ({ page }, use) => {
        const cartPage = new CartPage(page);
        await use(cartPage);
    },
    featureItems: async ({ page }, use) => {
        const featureItems = new BasePage(page).featureitems();
        await use(featureItems);
    },
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

    loginForm: async ({ page }, use) => {
        const loginComponent = new SignUpLoginPage(page).loginComponent();
        await use(loginComponent);
    }
});