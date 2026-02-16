import { strict as assert } from 'assert'

import * as tokenWalletModule from '../src/stripe/tokenWallet'
import * as stripeIndexModule from '../src/stripe/index'

describe('tokenWallet module parity', function () {
  it('exports callable handlers from stripe index', function () {
    assert.equal(typeof stripeIndexModule.getTokenWalletSummary, 'function')
    assert.equal(typeof stripeIndexModule.adjustTokenWalletBalance, 'function')
  })

  it('exposes applyTokenWalletDelta helper', function () {
    assert.equal(typeof tokenWalletModule.applyTokenWalletDelta, 'function')
  })
})
