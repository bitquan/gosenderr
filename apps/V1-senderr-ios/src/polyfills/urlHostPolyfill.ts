// Lightweight runtime polyfill for React Native URL getters that throw "not implemented".
// Some Web libraries (Firebase SDK, service-workers polyfills, etc.) access `new URL(...).host`
// which on some RN runtimes throws. This patch *only* defines safe getters when the
// environment implementation throws — it does not change browser behavior.

function needsPatch(): boolean {
  try {
    // Accessing `.host` on RN's URL implementation throws in some environments.
    // If this access succeeds and returns a string, no patch is necessary.
    return typeof new URL('http://example.com').host !== 'string';
  } catch {
    return true;
  }
}

if (typeof URL !== 'undefined' && needsPatch()) {
  try {
    const proto = URL.prototype as any;
    const readHref = (target: unknown): string => {
      try {
        const href = (target as {href?: unknown})?.href;
        if (typeof href === 'string' && href.length > 0) {
          return href;
        }
      } catch {
        // no-op
      }

      try {
        return String(target);
      } catch {
        return '';
      }
    };

    const parseHostParts = (target: unknown): {host: string; hostname: string; port: string} => {
      const href = readHref(target);
      if (!href) {
        return {host: '', hostname: '', port: ''};
      }

      const match = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#]+)/i.exec(href);
      if (!match?.[1]) {
        return {host: '', hostname: '', port: ''};
      }

      let authority = match[1];
      const atIndex = authority.lastIndexOf('@');
      if (atIndex >= 0) {
        authority = authority.slice(atIndex + 1);
      }

      if (authority.startsWith('[')) {
        const closing = authority.indexOf(']');
        if (closing === -1) {
          return {host: authority, hostname: authority, port: ''};
        }
        const hostname = authority.slice(0, closing + 1);
        const remainder = authority.slice(closing + 1);
        const port = remainder.startsWith(':') ? remainder.slice(1) : '';
        return {
          host: port ? `${hostname}:${port}` : hostname,
          hostname,
          port: /^\d+$/.test(port) ? port : '',
        };
      }

      const colonIndex = authority.lastIndexOf(':');
      if (colonIndex > -1 && authority.indexOf(':') === colonIndex) {
        const hostPart = authority.slice(0, colonIndex);
        const portPart = authority.slice(colonIndex + 1);
        if (hostPart && /^\d+$/.test(portPart)) {
          return {
            host: `${hostPart}:${portPart}`,
            hostname: hostPart,
            port: portPart,
          };
        }
      }

      return {
        host: authority,
        hostname: authority,
        port: '',
      };
    };

    // Override getters in patch mode (even if a getter exists) because some runtimes
    // provide getters that throw "not implemented".
    Object.defineProperty(proto, 'host', {
      configurable: true,
      enumerable: false,
      get() {
        return parseHostParts(this).host;
      },
    });

    Object.defineProperty(proto, 'hostname', {
      configurable: true,
      enumerable: false,
      get() {
        return parseHostParts(this).hostname;
      },
    });

    Object.defineProperty(proto, 'port', {
      configurable: true,
      enumerable: false,
      get() {
        return parseHostParts(this).port;
      },
    });

    // eslint-disable-next-line no-console
    console.info('[polyfill] URL.host/hostname/port patched for React Native environment.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[polyfill] Failed to apply URL.host polyfill:', error);
  }
}
