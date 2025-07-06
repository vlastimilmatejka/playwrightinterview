import { test, expect, request, APIRequestContext } from '@playwright/test';
import { getAllProductListSchema } from '../response.schema.ts';
import Ajv from 'ajv';

const endpointURL = 'https://automationexercise.com';
let apiRequestContext;
type responseCode = 200 | 201;

test.beforeAll(async () => {
    apiRequestContext = await request.newContext({
    baseURL: endpointURL,
  });
});

test('Get All Basic request', async () => {
  const responseStatusCode: responseCode = 200;
  const response = await apiRequestContext.get('/api/productsList');
  expect(response.status()).toBe(responseStatusCode);
});

test('Get All Products List schema validation', async () => {
  const response = await apiRequestContext.get('/api/productsList');
  const responseBody = await response.json();
  const ajv = new Ajv();
  const validate = ajv.compile(getAllProductListSchema);
  const valid = validate(responseBody);

  expect(valid, `Schema validation errors: ${JSON.stringify(validate.errors, null, 2)}`).toBe(true);
});

