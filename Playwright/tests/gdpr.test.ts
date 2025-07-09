import { expect } from '@playwright/test';
import { test } from '../support/fixtures';

test.beforeEach(async ({ page, basePage }) => {
    await page.goto(basePage.getURL(test.info()));
});

test.skip('GDPR direct agree', async ({ page, gdpr}) => {
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test.skip('GDPR manage options and accept all', async ({ gdpr }) => { 
    await expect(gdpr.self()).toBeVisible();
    await gdpr.manageOptions().click();

    await expect(gdpr.acceptAll()).toBeVisible();
    await gdpr.acceptAll().click();

    await expect(gdpr.self()).toBeHidden();
});

test.skip('GDPR manage options and confirm choices', async ({ gdpr }) => { 
    await expect(gdpr.self()).toBeVisible();
    await gdpr.manageOptions().click();

    await expect(gdpr.confirmChoices().nth(0)).toBeVisible();
    await gdpr.confirmChoices().nth(0).click();

    await expect(gdpr.self()).toBeHidden();
});