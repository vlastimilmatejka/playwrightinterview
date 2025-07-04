import { Page } from '@playwright/test';
import BasePage from './base.page';

export default class CartPage extends BasePage {
    readonly page: Page;

    constructor(page: Page) {
        super(page);
        this.page = page;
    }

    numberOfItemsInCart() {

    return 2;
    }

    removeItemFromCart(id: number) {
        
    }

    proceedToCheckout() {
       
    }

}