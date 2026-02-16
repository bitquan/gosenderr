export type NavigationPoint = {
  lat: number;
  lng: number;
};

function isAppleMapsPreferred(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
}

function serializePoint(point?: NavigationPoint): string | null {
  if (!point) return null;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  return `${point.lat},${point.lng}`;
}

export function buildExternalNavigationUrl(
  destination: NavigationPoint,
  origin?: NavigationPoint,
): string {
  const destinationValue = serializePoint(destination);
  if (!destinationValue) {
    throw new Error("Destination coordinates are required");
  }

  const originValue = serializePoint(origin);

  if (isAppleMapsPreferred()) {
    const params = new URLSearchParams({ daddr: destinationValue, dirflg: "d" });
    if (originValue) {
      params.set("saddr", originValue);
    }
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const params = new URLSearchParams({ api: "1", destination: destinationValue });
  if (originValue) {
    params.set("origin", originValue);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function openExternalNavigation(
  destination: NavigationPoint,
  origin?: NavigationPoint,
): string {
  const url = buildExternalNavigationUrl(destination, origin);

  if (typeof window !== "undefined") {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.assign(url);
    }
  }

  return url;
}
