import LoginComponent from "../components/login.component";
import { Page } from '@playwright/test';
import { TestInfo } from '@playwright/test';
import BasePage from "./base.page";

export default class SignUpLoginPage extends BasePage {

    constructor(page: Page) {
        super(page);
    }

    public loginComponent() {
        return new LoginComponent(this.page);
    }

    public getURL( testinfo: TestInfo){
          const url = 'login';
          return testinfo.project.use.baseURL + url;
    }

}