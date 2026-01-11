import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mb;
import 'package:geolocator/geolocator.dart';
import 'package:flutter/services.dart';

import '../../core/config/mapbox_config.dart';
import '../../core/services/routing_service.dart';
import '../../core/services/photo_service.dart';
import '../../core/services/storage_service.dart';
import '../../core/services/driver_firestore_service.dart';
import 'driver_job_state.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> {
  // Map + annotations
  mb.MapboxMap? _map;
  mb.PointAnnotationManager? _pinManager;
  mb.PolylineAnnotationManager? _routeManager;

  // State machine
  DriverJobState _state = DriverJobState.idle;

  // TEST JOB (hardcoded - safe)
  // NOTE: mb.Position is NOT const in this SDK, so do not use `const`.
  final mb.Position _pickup = mb.Position(-77.4056, 38.9599);
  final mb.Position _dropoff = mb.Position(-77.4185, 38.9678);
  final String _testJobId = 'test_job_001';

  // Runtime
  Position? _me;
  List<mb.Position> _routePoints = const [];
  String? _instruction;
  Timer? _simTimer;

  // Photos
  File? _pickupPhotoFile;
  File? _dropoffPhotoFile;
  String? _pickupPhotoUrl;
  String? _dropoffPhotoUrl;

  // Services
  late final RoutingService _routing = RoutingService(MapboxConfig.accessToken);
  final PhotoService _photos = PhotoService();
  final StorageService _storage = StorageService();
  final DriverFirestoreService _fire = DriverFirestoreService();

  // UI paddings (safe areas)
  EdgeInsets get _safe => MediaQuery.of(context).padding;

  @override
  void initState() {
    super.initState();
    mb.MapboxOptions.setAccessToken(MapboxConfig.accessToken);
  }

  @override
  void dispose() {
    _simTimer?.cancel();
    super.dispose();
  }

  Future<void> _onMapCreated(mb.MapboxMap map) async {
    _map = map;

    // Delay init until after first frame (prevents invalid size issues)
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _initMap();
    });
  }

  Future<void> _initMap() async {
    final map = _map;
    if (map == null) return;

    await map.loadStyleURI(mb.MapboxStyles.MAPBOX_STREETS);

    // Location (real)
    _me = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.best);

    await map.setCamera(
      mb.CameraOptions(
        center: mb.Point(coordinates: mb.Position(_me!.longitude, _me!.latitude)),
        zoom: 12.5,
      ),
    );

    // Managers (only after style loaded)
    _pinManager = await map.annotations.createPointAnnotationManager();
    _routeManager = await map.annotations.createPolylineAnnotationManager();

    // Add pickup pin
    final marker = (await rootBundle.load('assets/marker.png')).buffer.asUint8List();
    await _pinManager!.create(
      mb.PointAnnotationOptions(
        geometry: mb.Point(coordinates: _pickup),
        image: marker,
        iconSize: 1.1,
      ),
    );

    // Make sure driver is online (Firestore)
    try {
      await _fire.setDriverOnline();
    } catch (_) {
      // If you're not logged in yet, this will fail. That's fine for UI tests.
    }

    setState(() {});
  }

  // ---- ROUTE + CAMERA ----

  Future<void> _drawRouteTo(mb.Position target) async {
    if (_me == null) return;

    final from = mb.Position(_me!.longitude, _me!.latitude);
    _routePoints = await _routing.fetchRoute(from: from, to: target);

    if (_routeManager != null) {
      await _routeManager!.deleteAll();
      await _routeManager!.create(
        mb.PolylineAnnotationOptions(
          geometry: mb.LineString(coordinates: _routePoints),
          lineColor: 0xFF1E90FF,
          lineWidth: 6.0,
          lineOpacity: 0.9,
        ),
      );
    }

    await _fitCameraToRoute(_routePoints);
    setState(() {});
  }

  Future<void> _fitCameraToRoute(List<mb.Position> pts) async {
    final map = _map;
    if (map == null || pts.isEmpty) return;

    // Build bounds
    double minLat = pts.first.lat.toDouble();
    double maxLat = pts.first.lat.toDouble();
    double minLng = pts.first.lng.toDouble();
    double maxLng = pts.first.lng.toDouble();

    for (final p in pts) {
      final lat = p.lat.toDouble();
      final lng = p.lng.toDouble();
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    // Center on bounds mid-point (Mapbox Flutter 2.x CameraOptions has no `bounds:`)
    final center = mb.Point(
      coordinates: mb.Position((minLng + maxLng) / 2.0, (minLat + maxLat) / 2.0),
    );

    // Quick heuristic zoom based on span. Good enough for MVP.
    final latSpan = (maxLat - minLat).abs();
    final lngSpan = (maxLng - minLng).abs();
    final span = (latSpan > lngSpan) ? latSpan : lngSpan;

    double zoom;
    if (span < 0.005) {
      zoom = 15.5;
    } else if (span < 0.02) zoom = 14.0;
    else if (span < 0.06) zoom = 12.5;
    else zoom = 11.0;

    await map.easeTo(
      mb.CameraOptions(center: center, zoom: zoom),
      mb.MapAnimationOptions(duration: 900),
    );
  }

  // ---- SIM DRIVER ----
  void _startSimTo(mb.Position target, {required DriverJobState arrivingState}) {
    _simTimer?.cancel();
    _instruction = 'Sim driving…';

    // Very simple sim: move your “me” location toward target
    _simTimer = Timer.periodic(const Duration(milliseconds: 650), (t) {
      if (_me == null) return;

      final cur = mb.Position(_me!.longitude, _me!.latitude);
      final dx = (target.lng - cur.lng);
      final dy = (target.lat - cur.lat);

      // close enough
      if (dx.abs() < 0.00015 && dy.abs() < 0.00015) {
        t.cancel();
        setState(() {
          _instruction = 'Arrived.';
          _state = arrivingState;
        });
        return;
      }

      final next = mb.Position(cur.lng + dx * 0.18, cur.lat + dy * 0.18);
      setState(() {
        _me = Position(
          latitude: next.lat.toDouble(),
          longitude: next.lng.toDouble(),
          timestamp: DateTime.now(),
          accuracy: 5,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          headingAccuracy: 0,
          speed: 0,
          speedAccuracy: 0,
        );
      });
    });
  }

  // ---- ACTIONS ----

  Future<void> _acceptJob() async {
    setState(() => _state = DriverJobState.enroutePickup);

    // Firestore: claim (if logged in) - optional for UI tests
    try {
      await _fire.claimJob(_testJobId);
      await _fire.updateJob(_testJobId, {
        'status': 'assigned',
        'pickup': {'lat': _pickup.lat, 'lng': _pickup.lng},
        'dropoff': {'lat': _dropoff.lat, 'lng': _dropoff.lng},
      });
    } catch (_) {}

    await _drawRouteTo(_pickup);
    _startSimTo(_pickup, arrivingState: DriverJobState.arrivedPickup);
  }

  Future<void> _confirmPickupProximity() async {
    if (_me == null) return;
    final meters = Geolocator.distanceBetween(
      _me!.latitude, _me!.longitude, _pickup.lat.toDouble(), _pickup.lng.toDouble(),
    );
    if (meters > 80) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You must be closer to the pickup location.')),
      );
      return;
    }
    setState(() => _state = DriverJobState.pickupPhotoTaken);
  }

  Future<void> _takePickupPhoto() async {
    final file = await _photos.takePhoto();
    if (file == null) return;
    setState(() => _pickupPhotoFile = file);
  }

  Future<void> _uploadPickupPhoto() async {
    if (_pickupPhotoFile == null) return;

    // Upload to Storage
    final url = await _storage.uploadJobPhoto(jobId: _testJobId, file: _pickupPhotoFile!, kind: 'pickup');
    _pickupPhotoUrl = url;

    // Firestore: attach + progress (optional for UI tests)
    try {
      await _fire.updateJob(_testJobId, {'pickupPhotoUrl': url, 'status': 'picked_up'});
    } catch (_) {}

    setState(() => _state = DriverJobState.enrouteDropoff);
    await _drawRouteTo(_dropoff);
    _startSimTo(_dropoff, arrivingState: DriverJobState.arrivedDropoff);
  }

  Future<void> _confirmDropoffProximity() async {
    if (_me == null) return;
    final meters = Geolocator.distanceBetween(
      _me!.latitude, _me!.longitude, _dropoff.lat.toDouble(), _dropoff.lng.toDouble(),
    );
    if (meters > 80) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You must be closer to the dropoff location.')),
      );
      return;
    }
    setState(() => _state = DriverJobState.dropoffPhotoTaken);
  }

  Future<void> _takeDropoffPhoto() async {
    final file = await _photos.takePhoto();
    if (file == null) return;
    setState(() => _dropoffPhotoFile = file);
  }

  Future<void> _uploadDropoffPhotoAndComplete() async {
    if (_dropoffPhotoFile == null) return;

    final url = await _storage.uploadJobPhoto(jobId: _testJobId, file: _dropoffPhotoFile!, kind: 'dropoff');
    _dropoffPhotoUrl = url;

    try {
      await _fire.updateJob(_testJobId, {
        'dropoffPhotoUrl': url,
        'status': 'completed',
        'completedAt': DateTime.now().toIso8601String(),
      });
      await _fire.setDriverOnline();
    } catch (_) {}

    setState(() => _state = DriverJobState.completed);
  }

  // ---- UI ----

  @override
  Widget build(BuildContext context) {
    final topPad = _safe.top + 12;
    final bottomPad = _safe.bottom + 16;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: mb.MapWidget(onMapCreated: _onMapCreated),
          ),

          // Top header (safe area)
          Positioned(
            top: topPad,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.55),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'Driver Dashboard',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ),

          // Bottom control panel (safe area)
          Positioned(
            left: 16,
            right: 16,
            bottom: bottomPad,
            child: _BottomPanel(
              state: _state,
              instruction: _instruction,
              pickupPhotoReady: _pickupPhotoFile != null,
              dropoffPhotoReady: _dropoffPhotoFile != null,
              onAccept: _acceptJob,
              onArrivedPickup: _confirmPickupProximity,
              onTakePickupPhoto: _takePickupPhoto,
              onConfirmPickupPhoto: _uploadPickupPhoto,
              onArrivedDropoff: _confirmDropoffProximity,
              onTakeDropoffPhoto: _takeDropoffPhoto,
              onConfirmDropoffPhoto: _uploadDropoffPhotoAndComplete,
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomPanel extends StatelessWidget {
  final DriverJobState state;
  final String? instruction;

  final bool pickupPhotoReady;
  final bool dropoffPhotoReady;

  final VoidCallback onAccept;
  final VoidCallback onArrivedPickup;
  final VoidCallback onTakePickupPhoto;
  final VoidCallback onConfirmPickupPhoto;

  final VoidCallback onArrivedDropoff;
  final VoidCallback onTakeDropoffPhoto;
  final VoidCallback onConfirmDropoffPhoto;

  const _BottomPanel({
    required this.state,
    required this.instruction,
    required this.pickupPhotoReady,
    required this.dropoffPhotoReady,
    required this.onAccept,
    required this.onArrivedPickup,
    required this.onTakePickupPhoto,
    required this.onConfirmPickupPhoto,
    required this.onArrivedDropoff,
    required this.onTakeDropoffPhoto,
    required this.onConfirmDropoffPhoto,
  });

  @override
  Widget build(BuildContext context) {
    Widget button(String text, VoidCallback onTap, {bool enabled = true}) {
      return SizedBox(
        width: double.infinity,
        height: 46,
        child: ElevatedButton(
          onPressed: enabled ? onTap : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6E56CF),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Text(text),
        ),
      );
    }

    String headline = state.label;

    List<Widget> actions = [];
    switch (state) {
      case DriverJobState.idle:
        actions.add(button('Accept Job', onAccept));
        break;

      case DriverJobState.enroutePickup:
        actions.add(button('Arrived at Pickup', onArrivedPickup));
        break;

      case DriverJobState.arrivedPickup:
        actions.add(button('Take Pickup Photo', onTakePickupPhoto));
        actions.add(const SizedBox(height: 10));
        actions.add(button('Confirm Pickup Photo', onConfirmPickupPhoto, enabled: pickupPhotoReady));
        break;

      case DriverJobState.pickupPhotoTaken:
        // Not used (we merge arrivedPickup actions)
        actions.add(const SizedBox.shrink());
        break;

      case DriverJobState.enrouteDropoff:
        actions.add(button('Arrived at Dropoff', onArrivedDropoff));
        break;

      case DriverJobState.arrivedDropoff:
        actions.add(button('Take Dropoff Photo', onTakeDropoffPhoto));
        actions.add(const SizedBox(height: 10));
        actions.add(button('Confirm Dropoff Photo', onConfirmDropoffPhoto, enabled: dropoffPhotoReady));
        break;

      case DriverJobState.dropoffPhotoTaken:
        actions.add(const SizedBox.shrink());
        break;

      case DriverJobState.completed:
        actions.add(const Text('Job Completed', style: TextStyle(color: Colors.greenAccent, fontSize: 16)));
        break;
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(16),
        color: Colors.black.withOpacity(0.60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(headline, style: const TextStyle(color: Colors.white70, fontSize: 14)),
            if (instruction != null) ...[
              const SizedBox(height: 6),
              Text(instruction!, style: const TextStyle(color: Colors.white54, fontSize: 12)),
            ],
            const SizedBox(height: 12),
            ...actions,
          ],
        ),
      ),
    );
  }
}
