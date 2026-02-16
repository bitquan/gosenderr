const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalHost(hostname: string): boolean {
  if (!hostname) return true;
  if (LOCAL_HOSTS.has(hostname)) return true;
  return hostname.endsWith(".local");
}

export function isLiveWebRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return !isLocalHost(window.location.hostname);
}
