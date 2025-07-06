import { test, expect, request, APIRequestContext } from '@playwright/test';
import { loginNoParametersSchema } from '../response.schema.ts';
import Ajv from 'ajv'

const endpointURL = 'https://automationexercise.com';
let apiRequestContext;
type responseCode = 200 | 400 | 404 | 405;

test.beforeAll(async () => {
    apiRequestContext = await request.newContext({
        baseURL: endpointURL,
    });
});

test('Call login api without parameters', async () => {
    const responseStatusCode: responseCode = 405;
    const response = await apiRequestContext.get('/api/verifyLogin');

    const responseBody = await response.json();
    const responseCode = responseBody.responseCode;
    expect(responseCode).toBe(responseStatusCode);

    const ajv = new Ajv();
    const validate = ajv.compile(loginNoParametersSchema);
    const valid = validate(responseBody);

    expect(valid, `Schema validation errors: ${JSON.stringify(validate.errors, null, 2)}`).toBe(true);
});

test('Call login api with valid credentials', async () => {
    const responseStatusCode: responseCode = 200;
    const data = {
        email: 'test01@test.cz',
        password: '12345678'
    }

    const response = await apiRequestContext.post('/api/verifyLogin', {
        form: data
    });

    const responseBody = await response.json();
    const responseCode = responseBody.responseCode;
    expect(responseCode).toBe(responseStatusCode);
});

test('Call login api without email address', async () => {
    const responseStatusCode: responseCode = 400;
    const data = {
        password: 'PSWD1234'
    }

    const response = await apiRequestContext.post('/api/verifyLogin', {
        form: data
    });

    const responseBody = await response.json();
    const responseCode = responseBody.responseCode;
    expect(responseCode).toBe(responseStatusCode);

});

test('Call login api for delete request', async () => {
    const responseStatusCode: responseCode = 405;
    const response = await apiRequestContext.delete('/api/verifyLogin');
    const responseBody = await response.json();
    const responseCode = responseBody.responseCode;
    expect(responseCode).toBe(responseStatusCode);
});