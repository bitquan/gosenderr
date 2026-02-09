export const requestLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation?.getCurrentPosition) {
      reject(new Error("geolocation-unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  });
};
