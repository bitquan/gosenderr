/* eslint-env detox/detox */
import {device, element, by, expect} from 'detox';

describe('Map gesture → manual camera', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('swipe on map switches camera to Manual and moves the map', async () => {
    // Ensure Map screen is visible (app defaults to dashboard) — navigate if needed
    // This assumes the Map screen is the app entry or reachable; adapt if routing differs.

    // perform a swipe gesture on the map surface (thumb drag)
    await expect(element(by.id('map-surface'))).toBeVisible();
    await element(by.id('map-surface')).swipe('left', 'fast', 0.5);

    // panel should now show Camera: Manual
    await expect(element(by.id('panel-camera-mode'))).toHaveText('Camera: Manual');
  });
});