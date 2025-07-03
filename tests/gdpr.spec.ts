import { test, expect } from '@playwright/test';
import BasePage from '../pages/base.page';

test('GDPR direct agree', async ({ page }) => {
    await page.goto('/');
    const gdpr = new BasePage(page).gdprConsent();
    
    await expect(gdpr.self()).toBeVisible();
    gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('GDPR manage options and accept all', async ({ page }) => {
    await page.goto('/');
    const gdpr = new BasePage(page).gdprConsent();
    
    await expect(gdpr.self()).toBeVisible();
    gdpr.manageOptions().click();

    await expect(gdpr.acceptAll()).toBeVisible();
    gdpr.acceptAll().click();

    await expect(gdpr.self()).toBeHidden();
});

test('GDPR manage options and confirm choices', async ({ page }) => {
    await page.goto('/');
    const gdpr = new BasePage(page).gdprConsent();
    
    await expect(gdpr.self()).toBeVisible();
    gdpr.manageOptions().click();

    await expect(gdpr.confirmChoices().nth(0)).toBeVisible();
    gdpr.confirmChoices().nth(0).click();

    await expect(gdpr.self()).toBeHidden();
});