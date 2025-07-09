import {expect } from '@playwright/test';
import { test } from '../support/fixtures';

test.only('Debugging Playwright Tests', async ({ page, basePage, gdpr }) => {
    console.log('Debugging Playwright Tests');
    await page.goto(basePage.getURL(test.info())); // Example URL to navigate to
    await page.goto(basePage.getURL(test.info()),{waitUntil: 'load'});
    await expect(page).toHaveURL('https://www.automationexercise.com/')
});