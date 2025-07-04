import { Page } from '@playwright/test';

export default class SidebarComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    self() {
        return this.page.locator('');
    }

    selectCategory(category: string) {
        this.self().locator('').click();
    }

    selectBrant(brand: string) {
        this.self().locator('').click();
    }
}