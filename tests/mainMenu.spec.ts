import { test, expect,} from '@playwright/test';
import { mainMenuSelectors } from "../testSelectors";
import BasePage from '../pages/base.page';
import { mainMenuItemsEN } from '../enums/Languages/EN/mainMenuEN.translations';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const gdpr = new BasePage(page).gdprConsent();
    
    // Check if the GDPR consent banner is visible
    expect(gdpr.self()).toBeVisible();
    gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('Main Menu Navigation items EN', async ({ page }) => {

    const mainMenu = new BasePage(page).mainMenu();
    mainMenu.checkElements(mainMenuSelectors.menuItem, mainMenuItemsEN)    
});

test('Main Menu Logo', async ({ page }) => {
    const mainMenu = new BasePage(page).mainMenu();
    const logo = mainMenu.logo();
    expect(logo).toBeVisible();
    expect(await logo.locator('..').getAttribute('href')).not.toBeNull();
});