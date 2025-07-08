import { test, expect } from '@playwright/test';

test.only('Debugging Playwright Tests', async ({ page }) => {
    // This is a placeholder for debugging purposes.
    // You can add your debugging code here.
    console.log('Debugging Playwright Tests');
    await page.goto('https://google.com'); // Example URL to navigate to
    await expect(page.locator('[title="Hledat"]')).toBeVisible(); // Example assertion

});