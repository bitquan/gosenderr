// Jest manual mock for @react-native-community/geolocation
let _watchId = 0;

const mockPosition = () => ({
  coords: { latitude: 0, longitude: 0, accuracy: 1, altitude: null, heading: null, speed: null },
  timestamp: Date.now(),
});

module.exports = {
  requestAuthorization: jest.fn((success, error) => {
    if (typeof success === 'function') success();
  }),
  getCurrentPosition: jest.fn((success, error) => {
    if (typeof success === 'function') success(mockPosition());
  }),
  watchPosition: jest.fn((success, error) => {
    const id = ++_watchId;
    if (typeof success === 'function') success(mockPosition());
    return id;
  }),
  clearWatch: jest.fn(() => {}),
};
