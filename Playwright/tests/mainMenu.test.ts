import { mainMenuSelectors } from "../support/testSelectors";
import { mainMenuItemsNotLoggedEN } from "../constants/Languages/EN/mainMenuENtranslations.const";
import { test } from '../support/fixtures';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page, gdpr, basePage }) => {
    await page.goto(basePage.getURL(test.info()));


    // Check if the GDPR consent banner is visible
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test.skip('Main Menu Navigation items EN', async ({ mainMenu }) => {
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN)    
test.skip('Main Menu Navigation items EN', async ({ mainMenu }) => {
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN)    
});

test.skip('Main Menu Logo', async ({ mainMenu }) => {
    const logo = await mainMenu.logo();
    await expect(logo).toBeVisible();
    await expect(await logo.locator('..').getAttribute('href')).not.toBeNull();
test.skip('Main Menu Logo', async ({ mainMenu }) => {
    const logo = await mainMenu.logo();
    await expect(logo).toBeVisible();
    await expect(await logo.locator('..').getAttribute('href')).not.toBeNull();
});