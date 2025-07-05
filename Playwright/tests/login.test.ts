import {expect} from '@playwright/test';
import { test } from '../support/fixtures';
import { validAccount, validEmailInvalidPassword, notRegisteredAccount } from '../enums/login.enum';
import { mainMenuItemsLoggedInEN, mainMenuItemsNotLoggedEN} from '../enums/Languages/EN/mainMenuENtranslations.enum';
import { mainMenuSelectors } from '../support/testSelectors';

test.beforeEach(async ({ page, gdpr, signUpLoginPage }) => {
    await page.goto(signUpLoginPage.getURL(test.info()));
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden();
});

test('Login Tests with valid credentials', async ({loginForm, signUpLoginPage}) => {
    await loginForm.login(validAccount.email, validAccount.password);
    await signUpLoginPage.mainMenu().checkElements(mainMenuSelectors.menuItem, mainMenuItemsLoggedInEN);
});

test('Login Tests with invalid credentials', async ({ loginForm, mainMenu }) => {
    await loginForm.login(validEmailInvalidPassword.email, validEmailInvalidPassword.password);
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN);
});

test('Login Tests with not registered account', async ({loginForm, mainMenu}) => {
    await loginForm.login(notRegisteredAccount.email, notRegisteredAccount.password);
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN);
});