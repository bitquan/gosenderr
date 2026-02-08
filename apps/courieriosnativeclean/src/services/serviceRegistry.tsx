import React, {createContext, useContext, useMemo} from 'react';

import {analyticsNoopAdapter} from './adapters/analyticsNoopAdapter';
import {authFirebaseAdapter} from './adapters/authFirebaseAdapter';
import {featureFlagsService} from './featureFlagsService';
import {jobsFirebaseAdapter} from './adapters/jobsFirebaseAdapter';
import {locationNativeAdapter} from './adapters/locationNativeAdapter';
import {notificationsNoopAdapter} from './adapters/notificationsNoopAdapter';
import {profileFirebaseAdapter} from './adapters/profileFirebaseAdapter';
import type {AnalyticsServicePort} from './ports/analyticsPort';
import type {AuthServicePort} from './ports/authPort';
import type {FeatureFlagsServicePort} from './ports/featureFlagsPort';
import type {JobsServicePort} from './ports/jobsPort';
import type {LocationServicePort} from './ports/locationPort';
import type {NotificationsServicePort} from './ports/notificationsPort';
import type {ProfileServicePort} from './ports/profilePort';

export type ServiceRegistry = {
  auth: AuthServicePort;
  jobs: JobsServicePort;
  location: LocationServicePort;
  notifications: NotificationsServicePort;
  analytics: AnalyticsServicePort;
  profile: ProfileServicePort;
  featureFlags: FeatureFlagsServicePort;
};

const defaultRegistry: ServiceRegistry = {
  auth: authFirebaseAdapter,
  jobs: jobsFirebaseAdapter,
  location: locationNativeAdapter,
  notifications: notificationsNoopAdapter,
  analytics: analyticsNoopAdapter,
  profile: profileFirebaseAdapter,
  featureFlags: featureFlagsService,
};

const ServiceRegistryContext = createContext<ServiceRegistry>(defaultRegistry);

export const ServiceRegistryProvider = ({
  children,
  overrides,
}: {
  children: React.ReactNode;
  overrides?: Partial<ServiceRegistry>;
}): React.JSX.Element => {
  const value = useMemo(
    () => ({
      ...defaultRegistry,
      ...overrides,
    }),
    [overrides],
  );

  return <ServiceRegistryContext.Provider value={value}>{children}</ServiceRegistryContext.Provider>;
};

export const useServiceRegistry = (): ServiceRegistry => useContext(ServiceRegistryContext);
