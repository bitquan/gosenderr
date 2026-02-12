import {describe, expect, it} from '@jest/globals';
import {canTransitionJobStatus, buildTransitionConflictMessage, getAllowedTransitions} from '../jobTransitionRules';

describe('jobTransitionRules', () => {
  it('allows valid transitions and same-status (idempotent)', () => {
    expect(canTransitionJobStatus('pending', 'accepted')).toBe(true);
    expect(canTransitionJobStatus('accepted', 'accepted')).toBe(true); // idempotent
    expect(canTransitionJobStatus('picked_up', 'delivered')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionJobStatus('pending', 'delivered')).toBe(false);
    expect(canTransitionJobStatus('delivered', 'pending')).toBe(false);
  });

  it('returns allowed transitions list', () => {
    const allowed = getAllowedTransitions('pending');
    expect(Array.isArray(allowed)).toBe(true);
    expect(allowed).toContain('accepted');
    expect(allowed).toContain('cancelled');
  });

  it('builds a useful conflict message', () => {
    const msg = buildTransitionConflictMessage('delivered', 'accepted');
    expect(msg).toContain('Cannot change job from delivered to accepted');
  });
});
