import {describe, expect, it} from '@jest/globals';

import {canTransitionJobStatus, getAllowedTransitions} from '../jobTransitionRules';

describe('jobTransitionRules', () => {
  it('allows skipping enroute_pickup when courier is already at pickup (assigned -> arrived_pickup)', () => {
    expect(canTransitionJobStatus('assigned', 'arrived_pickup')).toBe(true);
    expect(getAllowedTransitions('assigned')).toEqual(
      expect.arrayContaining(['enroute_pickup', 'arrived_pickup', 'cancelled']),
    );
  });
});
