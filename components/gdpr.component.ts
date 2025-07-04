import { expect, type Page } from '@playwright/test';
import { gdprSelectors } from '../support/testSelectors';

export default class GdprComponent {

    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    self() {
        return this.page.locator(gdprSelectors.self);
    }

    agree() {
        return this.self().locator(gdprSelectors.agree);
    }

    manageOptions() {
        return this.self().locator(gdprSelectors.manageOptions);
    }

    acceptAll() {
        return this.self().locator(gdprSelectors.acceptAll);
    }

    confirmChoices() {
        return this.self().locator(gdprSelectors.confirmChoices);
    }
}