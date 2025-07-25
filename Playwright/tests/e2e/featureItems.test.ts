import { expect } from "@playwright/test";
import { test} from '../../support/fixtures';

test.beforeEach(async ({ page, basePage, gdpr }) => {
    await page.goto(basePage.getURL(test.info()),{waitUntil: 'load'});
   // await expect(gdpr.self()).toBeVisible();
   // await gdpr.agree().click();
   // await expect(gdpr.self()).toBeHidden(); 
});

test('View product details', {tag:'@full'}, async ({page, featureItems }) => {
    const productId = 1;
    await featureItems.viewProductDetail(productId);
    await page.url().includes('product_details');
});

test('Add products to cart', {tag:'@full'}, async ({ featureItems, cartPage, page }) => {
    await featureItems.addProductToCart(1);
    await featureItems.addProductToCart(2)
    
    await page.goto(cartPage.getURL(test.info()),{waitUntil: 'load'});
    expect(await cartPage.numberOfItemsInCart()).toEqual(2);
});