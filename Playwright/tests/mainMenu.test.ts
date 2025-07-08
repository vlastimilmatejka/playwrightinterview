import { mainMenuSelectors } from "../support/testSelectors";
import { mainMenuItemsNotLoggedEN } from '../enums/Languages/EN/mainMenuENtranslations.enum';
import { test } from '../support/fixtures';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page, gdpr, basePage }) => {
    await page.goto(basePage.getURL(test.info()));
    console.log(`URL is: ${basePage.getURL(test.info())}`);
    // To access process.env in TypeScript, ensure @types/node is installed:
    // yarn add --dev @types/node
    console.log(`Process env is: ${JSON.stringify(process.env)}`);

    // Check if the GDPR consent banner is visible
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test.skip('Main Menu Navigation items EN', async ({ mainMenu }) => {
    await mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN)    
});

test.skip('Main Menu Logo', async ({ mainMenu }) => {
    const logo = await mainMenu.logo();
    await expect(logo).toBeVisible();
    await expect(await logo.locator('..').getAttribute('href')).not.toBeNull();
});