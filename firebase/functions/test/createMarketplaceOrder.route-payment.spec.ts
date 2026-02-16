import { assert } from 'chai';

import {
  buildPickupSequenceForOrder,
  calculateDeliveryFeeForOrder,
  calculateDeliveryMilesForOrder,
  resolveSellerPayoutForOrder,
} from '../src/stripe/createMarketplaceOrder';

describe('createMarketplaceOrder route + payment helpers', function () {
  it('orders geocoded pickup stops so the last stop is closest to dropoff', function () {
    const stops: any[] = [
      {
        sellerId: 'seller-a',
        orderId: 'order-a',
        suborderId: 'sub-a',
        pickupAddress: 'A',
        pickup: { lat: 0, lng: 0 },
        itemIds: ['item-a'],
        itemCount: 1,
      },
      {
        sellerId: 'seller-b',
        orderId: 'order-b',
        suborderId: 'sub-b',
        pickupAddress: 'B',
        pickup: { lat: 0, lng: 0.08 },
        itemIds: ['item-b'],
        itemCount: 1,
      },
      {
        sellerId: 'seller-c',
        orderId: 'order-c',
        suborderId: 'sub-c',
        pickupAddress: 'C',
        pickup: { lat: 0, lng: 0.04 },
        itemIds: ['item-c'],
        itemCount: 1,
      },
    ];

    const dropoff = { lat: 0, lng: 0.1 };
    const sequenced = buildPickupSequenceForOrder(stops, dropoff);

    assert.equal(sequenced.length, 3);
    assert.equal(sequenced[sequenced.length - 1].sellerId, 'seller-b');
    assert.equal(sequenced[0].sequence, 1);
    assert.equal(sequenced[1].sequence, 2);
    assert.equal(sequenced[2].sequence, 3);
  });

  it('appends ungeocoded stops at the end with null leg metrics', function () {
    const stops: any[] = [
      {
        sellerId: 'seller-a',
        orderId: 'order-a',
        suborderId: 'sub-a',
        pickupAddress: 'A',
        pickup: { lat: 0, lng: 0.01 },
        itemIds: ['item-a'],
        itemCount: 1,
      },
      {
        sellerId: 'seller-x',
        orderId: 'order-x',
        suborderId: 'sub-x',
        pickupAddress: 'X',
        pickup: null,
        itemIds: ['item-x'],
        itemCount: 1,
      },
    ];

    const sequenced = buildPickupSequenceForOrder(stops, { lat: 0, lng: 0.02 });
    const last = sequenced[sequenced.length - 1];

    assert.equal(last.sellerId, 'seller-x');
    assert.equal(last.legMilesFromPrevious, null);
    assert.equal(last.legMinutesFromPrevious, null);
  });

  it('enforces delivery minimum fee when dropoff coordinates are missing', function () {
    const routePlan: any = {
      pickupStopCount: 2,
      dropoff: null,
      stops: [],
    };
    const policy = {
      baseFee: 1,
      perMileFee: 0.5,
      perStopFee: 0.5,
      minimumFee: 4,
    };

    const fee = calculateDeliveryFeeForOrder(routePlan, policy);
    assert.equal(fee, 4);
  });

  it('includes final pickup-to-dropoff leg in delivery miles', function () {
    const routePlan: any = {
      dropoff: { lat: 0, lng: 0.1 },
      stops: [
        {
          sequence: 1,
          pickup: { lat: 0, lng: 0.01 },
          legMilesFromPrevious: null,
        },
        {
          sequence: 2,
          pickup: { lat: 0, lng: 0.07 },
          legMilesFromPrevious: 1.5,
        },
      ],
    };

    const miles = calculateDeliveryMilesForOrder(routePlan);
    assert.isAbove(miles, 1.5);
  });

  it('falls back seller payout to stripe when non-stripe payouts are disabled', function () {
    const result = resolveSellerPayoutForOrder('external_provider', false);
    assert.equal(result.sellerPayoutMode, 'stripe_connect');
    assert.equal(result.sellerPayoutExecution, 'stripe_connect_fallback');
  });

  it('keeps seller external payout when non-stripe payouts are enabled', function () {
    const result = resolveSellerPayoutForOrder('external_provider', true);
    assert.equal(result.sellerPayoutMode, 'external_provider');
    assert.equal(result.sellerPayoutExecution, 'deferred_non_stripe');
  });
});
