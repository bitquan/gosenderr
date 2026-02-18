<<<<<<< HEAD
const MAPBOX_TOKEN_PLACEHOLDER = 'your_mapbox_token';
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
export const HAS_MAPBOX_TOKEN =
  MAPBOX_TOKEN.length > 0 &&
  MAPBOX_TOKEN !== MAPBOX_TOKEN_PLACEHOLDER;

if (!HAS_MAPBOX_TOKEN) {
  console.warn('VITE_MAPBOX_TOKEN is not configured (or still using placeholder)');
=======
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN is not set');
>>>>>>> senderr_app
}

export { MAPBOX_TOKEN };
