import { expect } from '@playwright/test';
import { test } from '../../support/fixtures';

test.beforeEach(async ({ page, basePage, gdpr }) => {
    await page.goto(basePage.getURL(test.info()),{waitUntil: 'load'});
    await expect(gdpr.self()).toBeVisible();
    await gdpr.agree().click();
    await expect(gdpr.self()).toBeHidden(); 
});

test('Remove product from cart', {tag:'@full'}, async ({ page, featureItems, cartPage }) => {
    await featureItems.addProductToCart(1);
    await featureItems.addProductToCart(2);
    await featureItems.addProductToCart(3);
    await page.goto(cartPage.getURL(test.info()),{waitUntil: 'load'});
    await expect(cartPage.self()).toBeVisible();
    await cartPage.removeItemFromCart(1);
    await page.reload();
    
    expect(await cartPage.numberOfItemsInCart()).toEqual(2);
});