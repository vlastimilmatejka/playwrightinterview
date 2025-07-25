import { expect } from '@playwright/test';
import { test } from '../../support/fixtures';

test.beforeEach(async ({ page, basePage }) => {
    await page.goto(basePage.getURL(test.info()));
});

test('GDPR direct agree', {tag:'@regression'}, async ({ page, gdpr}) => {
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('GDPR manage options and accept all', {tag:'@regression'},async ({ gdpr }) => { 
    await expect(gdpr.self()).toBeVisible();
    await gdpr.manageOptions().click();

    await expect(gdpr.acceptAll()).toBeVisible();
    await gdpr.acceptAll().click();

    await expect(gdpr.self()).toBeHidden();
});

test('GDPR manage options and confirm choices',{tag:'@regression'}, async ({ gdpr }) => { 
    await expect(gdpr.self()).toBeVisible();
    await gdpr.manageOptions().click();

    await expect(gdpr.confirmChoices().nth(0)).toBeVisible();
    await gdpr.confirmChoices().nth(0).click();

    await expect(gdpr.self()).toBeHidden();
});