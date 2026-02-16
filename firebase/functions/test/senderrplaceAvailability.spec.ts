import { assert } from 'chai';

import {
  isWithinBookingWindow,
  pickUnavailableReason,
} from '../src/senderrplace/availabilityGate';

describe('senderrplace availability gate', function () {
  it('returns no-online-courier when there are no online couriers', function () {
    const reason = pickUnavailableReason(0, {
      locationUnavailable: 0,
      outOfRadius: 0,
      workModeDisabled: 0,
      equipmentUnavailable: 0,
      vehicleUnavailable: 0,
      capacityReached: 0,
    });
    assert.equal(reason, 'NO_ONLINE_COURIER');
  });

  it('uses deterministic priority order for unavailable reasons', function () {
    const reason = pickUnavailableReason(4, {
      locationUnavailable: 2,
      outOfRadius: 1,
      workModeDisabled: 1,
      equipmentUnavailable: 1,
      vehicleUnavailable: 1,
      capacityReached: 3,
    });
    assert.equal(reason, 'COURIER_CAPACITY_REACHED');
  });

  it('accepts current and near-future booking windows', function () {
    const now = Date.UTC(2026, 1, 8, 16, 0, 0);
    const tenMinutesAhead = now + (10 * 60 * 1000);
    const oneWeekAhead = now + (7 * 24 * 60 * 60 * 1000);

    assert.isTrue(isWithinBookingWindow(now, now));
    assert.isTrue(isWithinBookingWindow(tenMinutesAhead, now));
    assert.isTrue(isWithinBookingWindow(oneWeekAhead, now));
  });

  it('rejects booking windows outside allowed edge boundaries', function () {
    const now = Date.UTC(2026, 1, 8, 16, 0, 0);
    const tooFarPast = now - (11 * 60 * 1000);
    const tooFarFuture = now + (15 * 24 * 60 * 60 * 1000);

    assert.isFalse(isWithinBookingWindow(tooFarPast, now));
    assert.isFalse(isWithinBookingWindow(tooFarFuture, now));
  });
});
