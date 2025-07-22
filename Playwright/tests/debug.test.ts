import { expect } from '@playwright/test';
import { test } from '../support/fixtures';
import { chromium, BrowserContext  } from '@playwright/test';
import { gdprSelectors } from '../support/testSelectors';

test.beforeEach(async ({ page, basePage, gdpr }) => {
    await page.goto(basePage.getURL(test.info()),{waitUntil: 'load'});
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test.skip('Debugging Playwright Tests', async ({ page, basePage, gdpr }) => {
    console.log('Debugging Playwright Tests');
    await expect(page).toHaveURL(basePage.getURL(test.info()));
});