import { testUsers } from '../fixtures/users';

export async function injectCustomer(page: any) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.__E2E_USER = { uid: 'uid123', email: 'test-customer@gosenderr.com', displayName: 'Test Customer' };
  });
}

export async function injectVendor(page: any) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.__E2E_USER = { uid: 'vendor-uid', email: 'test-vendor@gosenderr.com', displayName: 'Vendor' };
  });
}