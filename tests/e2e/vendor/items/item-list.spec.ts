import { test, expect } from '@playwright/test';

test.describe('Vendor Items - list', () => {
  test('displays items from Firestore', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
      // @ts-ignore
      window.__E2E_MARKETPLACE_ITEMS = [
        {
          id: 'item123',
          title: 'Listed Item',
          description: 'Desc',
          price: 100,
          vendorId: 'vendor-uid',
          status: 'active'
        }
      ];
    });

    // Log requests and console messages to help debug route matching
    page.on('request', (req) => {
      if (req.url().includes('/v1/')) console.log('REQ:', req.method(), req.url());
    });

    page.on('console', (msg) => {
      console.log('PAGE LOG:', msg.type(), msg.text());
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

    // Primary route matcher
    await page.route('**/projects/**/databases/**/documents:runQuery', (route) => {
      console.log('Matched firestore runQuery route -> fulfilling response');
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([firestoreResponse.documents[0]]) });
    });

    // Fallback: some SDKs may use gRPC/web endpoints or different hostnames; match anything with googleapis or firestore
    await page.route('**/*runQuery*', (route) => {
      console.log('Matched fallback runQuery route -> fulfilling response for', route.request().url());
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([firestoreResponse.documents[0]]) });
    });

    await page.route('**/*googleapis.com/**', (route) => {
      console.log('Matched googleapis fallback -> fulfilling with runQuery payload for', route.request().url());
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [firestoreResponse.documents[0]] }) });
    });

    await page.goto('/vendor/dashboard');

    await expect(page.getByText('Listed Item')).toBeVisible();
  });
});