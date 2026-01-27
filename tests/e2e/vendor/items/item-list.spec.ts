import { test, expect } from '@playwright/test';

test.describe('Vendor Items - list', () => {
  test('displays items from Firestore', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
    });

    // stub marketplaceItems query to return one item
    const firestoreResponse = {
      documents: [
        {
          name: 'projects/test/databases/(default)/documents/marketplaceItems/item123',
          fields: {
            title: { stringValue: 'Listed Item' },
            description: { stringValue: 'Desc' },
            price: { integerValue: '100' },
            vendorId: { stringValue: 'vendor-uid' },
            status: { stringValue: 'active' }
          }
        }
      ]
    } as any;

    await page.route('**/projects/**/databases/**/documents:runQuery', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([firestoreResponse.documents[0]]) });
    });

    await page.goto('/vendor/dashboard');

    await expect(page.getByText('Listed Item')).toBeVisible();
  });
});