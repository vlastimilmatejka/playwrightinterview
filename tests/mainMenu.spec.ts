import { mainMenuSelectors } from "../testSelectors";

import { mainMenuItemsNotLoggedEN } from '../enums/Languages/EN/mainMenuENtranslations.enum';
import { test} from '../fixtures';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page, gdpr }) => {
    await page.goto(new BasePage(page).getURL(test.info()));
    // Check if the GDPR consent banner is visible
    expect(gdpr.self()).toBeVisible();
    gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('Main Menu Navigation items EN', async ({ mainMenu }) => {
    mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsNotLoggedEN)    
});

test('Main Menu Logo', async ({ mainMenu }) => {
    const logo = mainMenu.logo();
    expect(logo).toBeVisible();
    expect(await logo.locator('..').getAttribute('href')).not.toBeNull();
});