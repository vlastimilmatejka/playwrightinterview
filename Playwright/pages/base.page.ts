import GdprComponent from "../components/gdpr.component";
import MainMenuComponent from "../components/mainMenu.component";
import FeautreItemsComponent from "../components/featureItems.component";
import { Page } from '@playwright/test';
import { TestInfo } from '@playwright/test';

export default class BasePage {
   public page: Page;

   constructor(page: Page) {
      this.page = page;
   }

   public mainMenu() {
      return new MainMenuComponent(this.page);
   }

   public gdprConsent() {
      return new GdprComponent(this.page);
   }

   public featureitems(){
      return new FeautreItemsComponent(this.page);
   }

   public getURL( testinfo: TestInfo){
      const url = '';
      return testinfo.project.use.baseURL + url;
   }
}
