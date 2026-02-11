import {__featureFlagsInternals} from '../featureFlagsService';

describe('featureFlagsService', () => {
  it('uses defaults when remote config is missing fields', () => {
    const defaults = __featureFlagsInternals.defaultsFromDefinitions();
    const parsed = __featureFlagsInternals.parseRemoteFlags({});

    expect(parsed).toEqual(defaults);
  });

  it('maps remote fireflags document into courier runtime flags', () => {
    const parsed = __featureFlagsInternals.parseRemoteFlags({
      senderrIos: {
        trackingUpload: false,
        notifications: true,
        mapRouting: false,
        jobStatusActions: false,
      },
    });

    expect(parsed.trackingUpload).toBe(false);
    expect(parsed.notifications).toBe(true);
    expect(parsed.mapRouting).toBe(false);
    expect(parsed.jobStatusActions).toBe(false);
  });

  it('falls back to global flags when senderrIos namespace is absent', () => {
    const parsed = __featureFlagsInternals.parseRemoteFlags({
      courier: {
        workModes: false,
      },
      advanced: {
        pushNotifications: false,
      },
      delivery: {
        routes: false,
      },
    });

    expect(parsed.trackingUpload).toBe(false);
    expect(parsed.notifications).toBe(false);
    expect(parsed.mapRouting).toBe(false);
  });
});
