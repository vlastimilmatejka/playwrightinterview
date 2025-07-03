import LoginComponent from "../components/login.component";
import { Page } from 'playwright';
import { TestInfo } from '@playwright/test';
import BasePage from "./base.page";

export default class SignUpLoginPage extends BasePage {
    URL = 'login';

    constructor(page: Page) {
        super(page);
    }

    public loginComponent() {
        return new LoginComponent(this.page);
    }

    public async login(email: string, password: string) {
        await this.loginComponent().emailInput().fill(email);
        await this.loginComponent().passwordInput().fill(password);
        await this.loginComponent().loginButton().click();
    }

    public getURL( testinfo: TestInfo){
          const url = 'login';
          return testinfo.project.use.baseURL + url;
    }

}