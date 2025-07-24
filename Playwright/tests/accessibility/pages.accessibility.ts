import { injectAxe, checkA11y } from 'axe-playwright';
import { test } from '../../support/fixtures';
import config  from '../../playwright.config';

const pagesToTest = [
  { name: 'Home Page', url: config.use?.baseURL },
  { name: 'Cart Page', url: config.use?.baseURL + 'view_cart' },
];

test.describe('Accessibility tests for pages', () => {

    test('Check accessibility of the main page', async ({ page, basePage }) => {
        await page.goto(basePage.getURL(test.info()), { waitUntil: 'load' });
        await injectAxe(page);
        const results = await checkA11y(page);
        
    });

    test('Check accessibility of the cart page', async ({ page, basePage }) => {
        await page.goto(basePage.getURL(test.info()) + 'view_cart', { waitUntil: 'load' });
        await injectAxe(page);
        const results = await checkA11y(page);
        
    });
	
});