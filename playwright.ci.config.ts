import base from './playwright.config';

// CI config: reuse the base config but disable automatic webServer startup
// so we can build+serve artifacts deterministically in CI and let Playwright
// attach to the already-running preview servers.

export default {
  ...base,
  webServer: [],
};
