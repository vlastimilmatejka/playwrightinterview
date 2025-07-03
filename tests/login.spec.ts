import {expect} from '@playwright/test';
import { test } from '../fixtures';
import { validAccount, validEmailInvalidPassword, notRegisteredAccount } from '../enums/login.enum';
import { mainMenuItemsNotLoggedEN} from '../enums/Languages/EN/mainMenuENtranslations.enum';
import { mainMenuSelectors } from '../testSelectors';

test.beforeEach(async ({ page, gdpr, signUpLoginPage }) => {
    await page.goto(signUpLoginPage.getURL(test.info()));
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden();
});

test('Login Tests with valid credentials', async ({login}) => {
    await login.login(validAccount.email, validAccount.password);
});

test('Login Tests with invalid credentials', async ({ login, mainMenu }) => {
    await login.login(validEmailInvalidPassword.email, validEmailInvalidPassword.password);
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN);
});

test('Login Tests with not registered account', async ({signUpLoginPage}) => {
    await signUpLoginPage.loginComponent().login(notRegisteredAccount.email, notRegisteredAccount.password);
    await signUpLoginPage.mainMenu().checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN);
});