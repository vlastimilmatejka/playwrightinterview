import { expect, type Page } from '@playwright/test';
import { mainMenuSelectors } from '../support/testSelectors';

export default class MainMenuComponent {

readonly page: Page;

constructor(page: Page) {
    this.page = page;
}

self(id?: number){
        if (id !== undefined) {
            return this.page.locator(mainMenuSelectors.self).nth(id);
        }
        return this.page.locator(mainMenuSelectors.self);
}

async checkElements(selector: string, texts: string[]) {
    const elements = this.self().locator(selector);
    const count = await elements.count();

    for (let i = 0; i < count; i++) {
        await expect(elements.nth(i)).toBeVisible();
        await expect(elements.nth(i).getAttribute('href')).not.toBeNull();
        const text = await elements.nth(i).textContent();
        await expect(text).toContain(texts[i]);
    }
}

logo(){
    return this.self().locator(mainMenuSelectors.logo);
}

}