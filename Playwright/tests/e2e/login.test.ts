import {expect} from '@playwright/test';
import { test } from '../../support/fixtures';
import { validAccount, validEmailInvalidPassword, notRegisteredAccount } from '../../constants/login.const';
import { mainMenuItemsLoggedInEN, mainMenuItemsNotLoggedEN} from '../../constants/Languages/EN/mainMenuENtranslations.const';
import { mainMenuSelectors } from '../../support/testSelectors';

test.beforeEach(async ({ page, gdpr, signUpLoginPage }) => {
    await page.goto(signUpLoginPage.getURL(test.info()));
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden();
});

test('Login Tests with valid credentials',{tag:'@full'}, async ({loginForm, signUpLoginPage}) => {
    await loginForm.login(validAccount.email, validAccount.password);
    await signUpLoginPage.mainMenu().checkElements(mainMenuSelectors.menuItem, mainMenuItemsLoggedInEN);
});

test('Login Tests with invalid credentials',{tag:'@full'}, async ({ loginForm, mainMenu }) => {
    await loginForm.login(validEmailInvalidPassword.email, validEmailInvalidPassword.password);
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN);
});

test('Login Tests with not registered account',{tag:'@full'}, async ({loginForm, mainMenu}) => {
    await loginForm.login(notRegisteredAccount.email, notRegisteredAccount.password);
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN);
});