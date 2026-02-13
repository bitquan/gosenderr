// Lightweight runtime polyfill for React Native URL getters that throw "not implemented".
// Some Web libraries (Firebase SDK, service-workers polyfills, etc.) access `new URL(...).host`
// which on some RN runtimes throws. This patch *only* defines safe getters when the
// environment implementation throws — it does not change browser behavior.

function needsPatch(): boolean {
  try {
    // Accessing `.host` on RN's URL implementation throws in some environments.
    // If this access succeeds and returns a string, no patch is necessary.
    return typeof (new URL('http://example.com').host) !== 'string';
  } catch (err) {
    return true;
  }
}

if (typeof URL !== 'undefined' && needsPatch()) {
  try {
    const proto = URL.prototype as any;

    if (!Object.getOwnPropertyDescriptor(proto, 'host')?.get) {
      Object.defineProperty(proto, 'host', {
        configurable: true,
        enumerable: false,
        get() {
          // Build host from hostname + optional port (matches web URL.host behavior)
          // Use `this`'s `hostname`/`port` if available; fall back to parsing href.
          try {
            const hostname = typeof this.hostname === 'string' ? this.hostname : '';
            const port = typeof this.port === 'string' ? this.port : '';
            return port ? `${hostname}:${port}` : hostname;
          } catch (e) {
            // Last resort: try to parse from href string
            try {
              const href = String(this.href || this.toString());
              const parsed = /^(?:https?:)\/\/([^/]+)/i.exec(href);
              return parsed ? parsed[1] : '';
            } catch {
              return '';
            }
          }
        },
      });
    }

    // Hostname/port may also throw on some RN URL polyfills — add safe fallbacks.
    if (!Object.getOwnPropertyDescriptor(proto, 'hostname')?.get) {
      Object.defineProperty(proto, 'hostname', {
        configurable: true,
        enumerable: false,
        get() {
          try {
            const host = (this as any).host as string;
            if (!host) return '';
            return host.split(':')[0];
          } catch {
            try {
              const href = String(this.href || this.toString());
              const parsed = /^(?:https?:)\/\/([^/:]+)(?::\d+)?/i.exec(href);
              return parsed ? parsed[1] : '';
            } catch {
              return '';
            }
          }
        },
      });
    }

    if (!Object.getOwnPropertyDescriptor(proto, 'port')?.get) {
      Object.defineProperty(proto, 'port', {
        configurable: true,
        enumerable: false,
        get() {
          try {
            const host = (this as any).host as string;
            if (!host) return '';
            const parts = host.split(':');
            return parts.length > 1 ? parts.slice(1).join(':') : '';
          } catch {
            try {
              const href = String(this.href || this.toString());
              const parsed = /:(\d+)(?:$|\/)/.exec(href);
              return parsed ? parsed[1] : '';
            } catch {
              return '';
            }
          }
        },
      });
    }

    // eslint-disable-next-line no-console
    console.info('[polyfill] URL.host/hostname/port patched for React Native environment.');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[polyfill] Failed to apply URL.host polyfill:', e);
  }
}
