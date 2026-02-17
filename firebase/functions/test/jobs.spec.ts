import { strict as assert } from 'assert'

import * as claimJobModule from '../src/http/claimJob'
import * as updateJobStatusModule from '../src/http/updateJobStatus'
import * as functionsIndex from '../src/index'

describe('jobs callable handlers', function () {
  it('exports claimJob and updateJobStatus from functions index', function () {
    assert.equal(typeof functionsIndex.claimJob, 'function')
    assert.equal(typeof functionsIndex.updateJobStatus, 'function')
  })

  it('exposes claimJob and updateJobStatus handlers from http modules', function () {
    assert.equal(typeof claimJobModule.claimJob, 'function')
    assert.equal(typeof updateJobStatusModule.updateJobStatus, 'function')
  })
})
