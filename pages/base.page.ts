import GdprComponent from "../components/gdpr.component";
import MainMenuComponent from "../components/mainMenu.component";
import { Page } from 'playwright';

export default class HomePage {
   private page: Page;

   constructor(page: Page) {
      this.page = page;
   }

   public mainMenu() {
      return new MainMenuComponent(this.page);
   }

   public gdprConsent() {
      return new GdprComponent(this.page);
   }
}
