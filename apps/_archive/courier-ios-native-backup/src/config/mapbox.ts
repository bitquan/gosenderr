export const mapboxConfig = {
  // Removed hardcoded token from archive. Load at runtime from environment.
  accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
};
