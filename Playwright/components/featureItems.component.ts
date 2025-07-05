import { Page, expect, ElementHandle } from '@playwright/test';
import { featureItemsSelectors } from '../support/testSelectors';

export default class FeautreItemsComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    self() {
        return this.page.locator(featureItemsSelectors.self);
    }

    //viewProductDetail(id: number):void;
    //viewProductDetail(name: string):void;
    //viewProductDetail(identifier: number | string) {
    //    if (typeof identifier === 'number') {
            
    //   } else if (typeof identifier === 'string') {
            
    //    }
    //}

    async addProductToCart(id: number) {
        const targetCartButton = this.self().locator(featureItemsSelectors.addToCartButton).nth(id);
        await targetCartButton.hover();
        await expect(targetCartButton).toBeVisible();
        await targetCartButton.click();
        await expect(this.page.locator(featureItemsSelectors.modalSelf)).toBeVisible();
        await this.page.locator(featureItemsSelectors.modalButton).click();
    }

    async viewProductDetail(id: number) {
        const scroll = this.page.locator(featureItemsSelectors.cardDetail).nth(id);
        await scroll.scrollIntoViewIfNeeded();

        expect(this.self().locator(featureItemsSelectors.cardDetail).nth(id)).toBeVisible();
        await this.self().locator(featureItemsSelectors.cardDetail).nth(id).click();
    }

    findProductBasedHeadline(text: string) {
        return this.self().locator(featureItemsSelectors.productHeadline).filter({ hasText: text });
    }



}