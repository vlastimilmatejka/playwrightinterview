import { Page, TestInfo } from '@playwright/test';
import BasePage from './base.page';
import { cartSelectors } from '../support/testSelectors';

export default class CartPage extends BasePage {


    constructor(page: Page) {
        super(page);
    }

    self() {
        return this.page.locator(cartSelectors.self);
    }

    async numberOfItemsInCart() {
        const cartItems = await this.self().locator(cartSelectors.cartItem);

        return cartItems.count();   
    }

    async removeItemFromCart(id: number) {
       await this.self().locator(cartSelectors.deleteButton).nth(id).click();
    }

    public getURL( testinfo: TestInfo){
              const url = 'view_cart';
              return testinfo.project.use.baseURL + url;
    }

}