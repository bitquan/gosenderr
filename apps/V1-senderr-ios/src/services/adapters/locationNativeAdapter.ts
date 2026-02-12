import {useLocationTracking} from '../locationService';
import type {LocationServicePort} from '../ports/locationPort';

export const locationNativeAdapter: LocationServicePort = {
  useLocationTracking,
};
