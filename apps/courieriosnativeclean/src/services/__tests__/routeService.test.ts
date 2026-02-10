import {testExports} from '../routeService';

describe('routeService', () => {
  describe('parseRoadRoute', () => {
    it('returns null when payload has no routes', () => {
      const result = testExports.parseRoadRoute({});
      expect(result).toBeNull();
    });

    it('returns null when payload has empty routes array', () => {
      const result = testExports.parseRoadRoute({routes: []});
      expect(result).toBeNull();
    });

    it('returns null when coordinates array is missing', () => {
      const result = testExports.parseRoadRoute({
        routes: [
          {
            distance: 1000,
            duration: 60,
          },
        ],
      });
      expect(result).toBeNull();
    });

    it('returns null when coordinates array has fewer than 2 points', () => {
      const result = testExports.parseRoadRoute({
        routes: [
          {
            geometry: {coordinates: [[1.0, 2.0]]},
            distance: 1000,
            duration: 60,
          },
        ],
      });
      expect(result).toBeNull();
    });

    it('returns null when distance is not finite', () => {
      const result = testExports.parseRoadRoute({
        routes: [
          {
            geometry: {
              coordinates: [
                [1.0, 2.0],
                [3.0, 4.0],
              ],
            },
            distance: NaN,
            duration: 60,
          },
        ],
      });
      expect(result).toBeNull();
    });

    it('returns null when duration is not finite', () => {
      const result = testExports.parseRoadRoute({
        routes: [
          {
            geometry: {
              coordinates: [
                [1.0, 2.0],
                [3.0, 4.0],
              ],
            },
            distance: 1000,
            duration: Infinity,
          },
        ],
      });
      expect(result).toBeNull();
    });

    it('parses valid GeoJSON route with coordinates, distance, and duration', () => {
      const result = testExports.parseRoadRoute({
        routes: [
          {
            geometry: {
              coordinates: [
                [-122.4194, 37.7749],
                [-122.4084, 37.7849],
                [-122.3974, 37.7949],
              ],
            },
            distance: 5000,
            duration: 300,
          },
        ],
      });

      expect(result).toEqual({
        coordinates: [
          {latitude: 37.7749, longitude: -122.4194},
          {latitude: 37.7849, longitude: -122.4084},
          {latitude: 37.7949, longitude: -122.3974},
        ],
        distanceMeters: 5000,
        durationSeconds: 300,
      });
    });

    it('skips invalid coordinate entries in the coordinates array', () => {
      const result = testExports.parseRoadRoute({
        routes: [
          {
            geometry: {
              coordinates: [
                [-122.4194, 37.7749],
                [NaN, 37.7849], // invalid
                [-122.3974, 37.7949],
                'invalid', // invalid
                [-122.3864, 37.8049],
              ],
            },
            distance: 5000,
            duration: 300,
          },
        ],
      });

      expect(result).toEqual({
        coordinates: [
          {latitude: 37.7749, longitude: -122.4194},
          {latitude: 37.7949, longitude: -122.3974},
          {latitude: 37.8049, longitude: -122.3864},
        ],
        distanceMeters: 5000,
        durationSeconds: 300,
      });
    });
  });

  describe('decodeGeoJsonCoordinates', () => {
    it('returns empty array for non-array input', () => {
      expect(testExports.decodeGeoJsonCoordinates(null)).toEqual([]);
      expect(testExports.decodeGeoJsonCoordinates(undefined)).toEqual([]);
      expect(testExports.decodeGeoJsonCoordinates('string')).toEqual([]);
      expect(testExports.decodeGeoJsonCoordinates(123)).toEqual([]);
      expect(testExports.decodeGeoJsonCoordinates({})).toEqual([]);
    });

    it('skips entries with fewer than 2 elements', () => {
      const result = testExports.decodeGeoJsonCoordinates([
        [1.0, 2.0],
        [3.0], // only 1 element
        [5.0, 6.0],
        [], // empty
        [7.0, 8.0],
      ]);

      expect(result).toEqual([
        {latitude: 2.0, longitude: 1.0},
        {latitude: 6.0, longitude: 5.0},
        {latitude: 8.0, longitude: 7.0},
      ]);
    });

    it('skips entries with non-finite coordinates', () => {
      const result = testExports.decodeGeoJsonCoordinates([
        [1.0, 2.0],
        [NaN, 4.0],
        [5.0, Infinity],
        [7.0, 8.0],
      ]);

      expect(result).toEqual([
        {latitude: 2.0, longitude: 1.0},
        {latitude: 8.0, longitude: 7.0},
      ]);
    });

    it('decodes valid GeoJSON coordinates [lng, lat] to {latitude, longitude}', () => {
      const result = testExports.decodeGeoJsonCoordinates([
        [-122.4194, 37.7749],
        [-122.4084, 37.7849],
        [-122.3974, 37.7949],
      ]);

      expect(result).toEqual([
        {latitude: 37.7749, longitude: -122.4194},
        {latitude: 37.7849, longitude: -122.4084},
        {latitude: 37.7949, longitude: -122.3974},
      ]);
    });
  });
});
