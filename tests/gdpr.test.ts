import { expect } from '@playwright/test';
import { test } from '../support/fixtures';

test.beforeEach(async ({ page, basePage }) => {
    await page.goto(basePage.getURL(test.info()));
});

test('GDPR direct agree', async ({ page, gdpr}) => {
    await expect(gdpr.self()).toBeVisible();
    gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('GDPR manage options and accept all', async ({ gdpr }) => { 
    await expect(gdpr.self()).toBeVisible();
    gdpr.manageOptions().click();

    await expect(gdpr.acceptAll()).toBeVisible();
    gdpr.acceptAll().click();

    await expect(gdpr.self()).toBeHidden();
});

test('GDPR manage options and confirm choices', async ({ gdpr }) => { 
    await expect(gdpr.self()).toBeVisible();
    gdpr.manageOptions().click();

    await expect(gdpr.confirmChoices().nth(0)).toBeVisible();
    gdpr.confirmChoices().nth(0).click();

    await expect(gdpr.self()).toBeHidden();
});