import { assert } from 'chai'

import {
  SENDERRPLACE_ROLES,
  buildBookingLinkId,
  buildMerchantFingerprint,
  isValidConfirmationNumber,
  maskConfirmationNumber,
  normalizeConfirmationNumber,
  resolveUserRoles,
} from '../src/senderrplace/contracts'

describe('senderrplace contracts', function () {
  it('normalizes and validates confirmation numbers', function () {
    const normalized = normalizeConfirmationNumber(' ab-1234 ')
    assert.equal(normalized, 'AB-1234')
    assert.isTrue(isValidConfirmationNumber(normalized))
    assert.isFalse(isValidConfirmationNumber('bad value with spaces'))
  })

  it('builds deterministic merchant fingerprints from canonical fields', function () {
    const first = buildMerchantFingerprint({
      merchantName: '  Test  Market ',
      addressLine1: '123 Main St',
      city: 'Atlanta',
      state: 'GA',
      postalCode: '30303',
      country: 'US',
    })

    const second = buildMerchantFingerprint({
      merchantName: 'test market',
      addressLine1: '123   Main St',
      city: ' atlanta ',
      state: 'ga',
      postalCode: '30303',
      country: 'us',
    })

    assert.equal(first, second)
    assert.match(first, /^[a-f0-9]{40}$/)
  })

  it('builds deterministic booking link ids from idempotency seed', function () {
    const idA = buildBookingLinkId('seller-1:key-1')
    const idB = buildBookingLinkId('seller-1:key-1')
    const idC = buildBookingLinkId('seller-1:key-2')

    assert.equal(idA, idB)
    assert.notEqual(idA, idC)
    assert.match(idA, /^idem_[a-f0-9]{24}$/)
  })

  it('masks confirmation numbers for safe display', function () {
    assert.equal(maskConfirmationNumber('ABCD1234'), 'AB***34')
    assert.equal(maskConfirmationNumber('ABCD'), '****')
  })

  it('resolves dual-role users including seller profile fallback', function () {
    const roles = resolveUserRoles({
      role: SENDERRPLACE_ROLES.customer,
      roles: [SENDERRPLACE_ROLES.seller],
      sellerProfile: { active: true },
    })

    assert.include(roles, SENDERRPLACE_ROLES.customer)
    assert.include(roles, SENDERRPLACE_ROLES.seller)
  })
})
