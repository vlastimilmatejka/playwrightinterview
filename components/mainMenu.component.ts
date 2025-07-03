import { expect, type Locator, type Page } from '@playwright/test';
import { mainMenuSelectors } from '../testSelectors';

export default class MainMenuComponent {

readonly page: Page;

constructor(page: Page) {
    this.page = page;
}

self(){
    return this.page.locator(mainMenuSelectors.self);
}

async checkElements(selector: string, texts: string[]) {
    const elements = this.self().locator(selector);
    const count = await elements.count();

    for (let i = 0; i < count; i++) {
        expect(elements.nth(i)).toBeVisible();
        expect(elements.nth(i).getAttribute('href')).not.toBeNull();
        const text = await elements.nth(i).textContent();
        expect(text).toContain(texts[i]);
    }
}

logo(){
    return this.self().locator(mainMenuSelectors.logo);
}

}