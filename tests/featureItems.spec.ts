import { expect } from "playwright/test";
import { test} from '../support/fixtures';
import { fileURLToPath } from "url";

test.beforeEach(async ({ page, basePage, gdpr }) => {
    await page.goto(basePage.getURL(test.info()));
    // Check if the GDPR consent banner is visible
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('View product details', async ({page, feautreItems }) => {
    const productId = 1;
    await feautreItems.viewProductDetail(productId);
});