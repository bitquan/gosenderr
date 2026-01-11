import 'dart:convert';
import 'dart:io';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mb;

class RoutingService {
  final String accessToken;
  RoutingService(this.accessToken);

  Future<List<mb.Position>> fetchRoute({
    required mb.Position from,
    required mb.Position to,
  }) async {
    final url =
        'https://api.mapbox.com/directions/v5/mapbox/driving/'
        '${from.lng},${from.lat};${to.lng},${to.lat}'
        '?geometries=geojson&overview=full&access_token=$accessToken';

    final uri = Uri.parse(url);
    final httpClient = HttpClient();
    final req = await httpClient.getUrl(uri);
    final resp = await req.close();

    final status = resp.statusCode;
    final bytes = await resp.fold<List<int>>(<int>[], (p, e) {
      p.addAll(e);
      return p;
    });

    if (status < 200 || status >= 300) {
      throw Exception('Directions failed: HTTP $status');
    }

    final json =
        jsonDecode(String.fromCharCodes(bytes)) as Map<String, dynamic>;
    final routes = (json['routes'] as List?) ?? const [];
    if (routes.isEmpty) throw Exception('No routes returned');

    final geometry = routes[0]['geometry'] as Map<String, dynamic>?;
    final coords = (geometry?['coordinates'] as List?) ?? const [];
    if (coords.isEmpty) throw Exception('Route geometry missing');

    return coords
        .map(
          (c) =>
              mb.Position((c[0] as num).toDouble(), (c[1] as num).toDouble()),
        )
        .toList();
  }
}
