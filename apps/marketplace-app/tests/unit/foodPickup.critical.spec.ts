import { describe, expect, it } from 'vitest';

import { toCityZipLabel } from '../../src/lib/foodPickup';

describe('food pickup visibility label', () => {
  it('uses public city + zip from saved restaurant doc when present', () => {
    const label = toCityZipLabel({
      location: { address: '123 Main St, Arlington, VA 22201' },
      publicLocation: { city: 'Arlington', state: 'VA', zipCode: '22201' },
    });

    expect(label).toBe('Arlington 22201');
  });

  it('falls back to parsing city + zip from address when public location is missing', () => {
    const label = toCityZipLabel({
      location: { address: '1600 Pennsylvania Ave NW, Washington, DC 20500' },
    });

    expect(label).toBe('Washington 20500');
  });

  it('returns a safe fallback when no address parts are available', () => {
    const label = toCityZipLabel({
      location: { address: '' },
    });

    expect(label).toBe('Location available after booking');
  });
});
