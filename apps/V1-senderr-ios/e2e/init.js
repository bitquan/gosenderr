const detox = require('detox');

jest.setTimeout(120000);

beforeAll(async () => {
  await detox.init();
});

beforeEach(async () => {
  // no-op; individual tests can reload React Native if needed
});

afterAll(async () => {
  await detox.cleanup();
});
