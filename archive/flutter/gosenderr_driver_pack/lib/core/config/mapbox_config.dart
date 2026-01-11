class MapboxConfig {
  // Put your real token here (you already have this in your project).
  static const String accessToken = String.fromEnvironment('MAPBOX_ACCESS_TOKEN', defaultValue: '');
}
