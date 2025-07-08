import { test, expect } from '@playwright/test';

test.only('Debugging Playwright Tests', async ({ page }) => {
    
    console.log('Debugging Playwright Tests');
    await page.goto('https://google.com'); // Example URL to navigate to
    await expect(page).toHaveURL('https://www.google.com/');
});