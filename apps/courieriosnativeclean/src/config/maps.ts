import {runtimeConfig} from './runtime';

export type MapsValidationResult = {
  status: 'ok' | 'warning';
  message: string;
};

export const validateMapsConfig = (): MapsValidationResult => {
  if (runtimeConfig.maps.provider === 'mapbox') {
    if (!runtimeConfig.maps.mapboxAccessToken) {
      return {
        status: 'warning',
        message: 'Mapbox provider selected but no access token is configured.',
      };
    }
    return {
      status: 'ok',
      message: 'Mapbox token is configured.',
    };
  }

  return {
    status: 'ok',
    message: 'Native iOS maps provider is active.',
  };
};
