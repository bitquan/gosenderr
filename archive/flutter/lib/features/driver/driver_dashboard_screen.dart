import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mb;
import 'package:geolocator/geolocator.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/config/mapbox_config.dart';
import '../../core/services/routing_service.dart';
import '../../core/services/photo_service.dart';
import '../../core/services/storage_service.dart';
import '../../core/services/driver_firestore_service.dart';
import '../../core/services/jobs_service.dart';
import '../../core/models/job_model.dart';
import 'package:firebase_auth/firebase_auth.dart';
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
  bool _mapReady = false;

  // State machine
  DriverJobState _state = DriverJobState.idle;

  // Real job from Firestore
  JobModel? _currentJob;
  List<JobModel> _availableJobs = [];

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
  final JobsService _jobs = JobsService();
  StreamSubscription<List<JobModel>>? _jobsSub;

  // UI paddings (safe areas)
  EdgeInsets get _safe => MediaQuery.of(context).padding;

  @override
  void initState() {
    super.initState();
    mb.MapboxOptions.setAccessToken(MapboxConfig.accessToken);

    // Listen for open jobs
    _jobsSub = _jobs.openJobsStream().listen((jobs) {
      print('📋 Received ${jobs.length} open jobs');
      setState(() {
        _availableJobs = jobs;
        // Auto-select first job if none selected and we're idle
        if (_currentJob == null &&
            jobs.isNotEmpty &&
            _state == DriverJobState.idle) {
          _currentJob = jobs.first;
          print('✅ Auto-selected job: ${_currentJob!.id}');
          // Only show on map if map is ready
          if (_mapReady) {
            _showJobOnMap();
          }
        }
      });
    });
  }

  @override
  void dispose() {
    _simTimer?.cancel();
    _jobsSub?.cancel();
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

    // Check and request location permissions
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // Permissions denied, use default location
        print('Location permissions denied, using default location');
        _me = Position(
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: DateTime.now(),
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          headingAccuracy: 0,
          speed: 0,
          speedAccuracy: 0,
        );
      } else {
        _me = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.best,
        );
      }
    } else if (permission == LocationPermission.deniedForever) {
      // Permissions permanently denied, use default location
      print('Location permissions permanently denied, using default location');
      _me = Position(
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: DateTime.now(),
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
    } else {
      // Permissions granted
      _me = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );
    }

    await map.setCamera(
      mb.CameraOptions(
        center: mb.Point(
          coordinates: mb.Position(_me!.longitude, _me!.latitude),
        ),
        zoom: 12.5,
      ),
    );

    // Managers (only after style loaded)
    _pinManager = await map.annotations.createPointAnnotationManager();
    _routeManager = await map.annotations.createPolylineAnnotationManager();

    // Make sure driver is online (Firestore)
    try {
      await _fire.setDriverOnline();
    } catch (_) {
      // If you're not logged in yet, this will fail. That's fine for UI tests.
    }

    _mapReady = true;

    // If a job was already selected before map was ready, show it now
    if (_currentJob != null) {
      await _showJobOnMap();
    }

    setState(() {});
  }

  // Show current job pins on map
  Future<void> _showJobOnMap() async {
    final job = _currentJob;
    if (job == null || _pinManager == null || _map == null) {
      print(
        '⚠️ Cannot show job on map: job=${job != null}, pinManager=${_pinManager != null}, map=${_map != null}',
      );
      return;
    }

    print(
      '📍 Showing job ${job.id} on map: pickup=(${job.pickupLat}, ${job.pickupLng}), dropoff=(${job.dropoffLat}, ${job.dropoffLng})',
    );

    // Clear existing pins
    await _pinManager!.deleteAll();

    // Load marker images
    final pickupMarker = (await rootBundle.load(
      'assets/marker.png',
    )).buffer.asUint8List();
    final dropoffMarker = (await rootBundle.load(
      'assets/marker.png',
    )).buffer.asUint8List();

    // Add pickup pin (larger to distinguish)
    await _pinManager!.create(
      mb.PointAnnotationOptions(
        geometry: mb.Point(
          coordinates: mb.Position(job.pickupLng, job.pickupLat),
        ),
        image: pickupMarker,
        iconSize: 1.2,
      ),
    );

    // Add dropoff pin if available (standard size)
    if (job.dropoffLat != null && job.dropoffLng != null) {
      await _pinManager!.create(
        mb.PointAnnotationOptions(
          geometry: mb.Point(
            coordinates: mb.Position(job.dropoffLng!, job.dropoffLat!),
          ),
          image: dropoffMarker,
          iconSize: 0.9,
        ),
      );

      // Fit camera to show both points
      final bounds = [
        mb.Position(job.pickupLng, job.pickupLat),
        if (job.dropoffLat != null && job.dropoffLng != null)
          mb.Position(job.dropoffLng!, job.dropoffLat!),
      ];
      await _fitCameraToRoute(bounds);
    } else {
      // Just center on pickup
      await _map!.setCamera(
        mb.CameraOptions(
          center: mb.Point(
            coordinates: mb.Position(job.pickupLng, job.pickupLat),
          ),
          zoom: 13.0,
        ),
      );
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
      coordinates: mb.Position(
        (minLng + maxLng) / 2.0,
        (minLat + maxLat) / 2.0,
      ),
    );

    // Quick heuristic zoom based on span. Good enough for MVP.
    final latSpan = (maxLat - minLat).abs();
    final lngSpan = (maxLng - minLng).abs();
    final span = (latSpan > lngSpan) ? latSpan : lngSpan;

    double zoom;
    if (span < 0.005) {
      zoom = 15.5;
    } else if (span < 0.02)
      zoom = 14.0;
    else if (span < 0.06)
      zoom = 12.5;
    else
      zoom = 11.0;

    // Add padding by adjusting center slightly north to account for bottom card
    final paddedCenter = mb.Point(
      coordinates: mb.Position(
        center.coordinates.lng.toDouble(),
        center.coordinates.lat.toDouble() + (latSpan * 0.15), // Shift up 15%
      ),
    );

    await map.easeTo(
      mb.CameraOptions(center: paddedCenter, zoom: zoom),
      mb.MapAnimationOptions(duration: 900),
    );
  }

  // ---- SIM DRIVER ----
  void _startSimTo(
    mb.Position target, {
    required DriverJobState arrivingState,
  }) {
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
    final job = _currentJob;
    if (job == null) return;

    setState(() => _state = DriverJobState.enroutePickup);

    // Get current driver UID
    final driverUid = FirebaseAuth.instance.currentUser?.uid;
    if (driverUid == null) {
      print('❌ No driver logged in');
      return;
    }

    // Firestore: claim job and set status to assigned
    try {
      await _fire.claimJob(job.id);
      await _fire.updateJob(job.id, {
        'status': 'assigned',
        'assignedDriverUid': driverUid,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      print('✅ Job ${job.id} assigned to driver $driverUid');
    } catch (e) {
      print('❌ Failed to claim job: $e');
    }

    final pickup = mb.Position(job.pickupLng, job.pickupLat);
    await _drawRouteTo(pickup);
    _startSimTo(pickup, arrivingState: DriverJobState.arrivedPickup);
  }

  Future<void> _confirmPickupProximity() async {
    final job = _currentJob;
    if (_me == null || job == null) return;

    final meters = Geolocator.distanceBetween(
      _me!.latitude,
      _me!.longitude,
      job.pickupLat,
      job.pickupLng,
    );
    if (meters > 80) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You must be closer to the pickup location.'),
        ),
      );
      return;
    }
    setState(() => _state = DriverJobState.pickupPhotoTaken);
  }

  Future<void> _takePickupPhoto() async {
    try {
      final file = await _photos.takePhoto();
      if (file == null) return;
      setState(() => _pickupPhotoFile = file);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Camera not available - auto-proceeding for simulator testing',
            ),
            duration: Duration(seconds: 1),
          ),
        );
        // Skip photo step entirely in simulator
        await _skipPickupPhotoAndProceed();
      }
    }
  }

  Future<void> _skipPickupPhotoAndProceed() async {
    print('🚀 Skip pickup photo - proceeding to dropoff');
    final job = _currentJob;
    if (job == null) {
      print('❌ No current job, cannot skip');
      return;
    }

    setState(() => _state = DriverJobState.enrouteDropoff);

    if (job.dropoffLat != null && job.dropoffLng != null) {
      final dropoff = mb.Position(job.dropoffLng!, job.dropoffLat!);
      await _drawRouteTo(dropoff);
      _startSimTo(dropoff, arrivingState: DriverJobState.arrivedDropoff);
    }
  }

  Future<void> _uploadPickupPhoto() async {
    final job = _currentJob;
    if (_pickupPhotoFile == null || job == null) return;

    // Upload to Storage
    final url = await _storage.uploadJobPhoto(
      jobId: job.id,
      file: _pickupPhotoFile!,
      kind: 'pickup',
    );
    _pickupPhotoUrl = url;

    // Firestore: attach + progress (optional for UI tests)
    try {
      await _fire.updateJob(job.id, {
        'pickupPhotoUrl': url,
        'status': 'picked_up',
      });
    } catch (_) {}

    setState(() => _state = DriverJobState.enrouteDropoff);

    if (job.dropoffLat != null && job.dropoffLng != null) {
      final dropoff = mb.Position(job.dropoffLng!, job.dropoffLat!);
      await _drawRouteTo(dropoff);
      _startSimTo(dropoff, arrivingState: DriverJobState.arrivedDropoff);
    }
  }

  Future<void> _confirmDropoffProximity() async {
    final job = _currentJob;
    if (_me == null ||
        job == null ||
        job.dropoffLat == null ||
        job.dropoffLng == null) {
      return;
    }

    final meters = Geolocator.distanceBetween(
      _me!.latitude,
      _me!.longitude,
      job.dropoffLat!,
      job.dropoffLng!,
    );
    if (meters > 80) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You must be closer to the dropoff location.'),
        ),
      );
      return;
    }
    setState(() => _state = DriverJobState.dropoffPhotoTaken);
  }

  Future<void> _takeDropoffPhoto() async {
    try {
      final file = await _photos.takePhoto();
      if (file == null) return;
      setState(() => _dropoffPhotoFile = file);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Camera not available - completing job for simulator testing',
            ),
            duration: Duration(seconds: 1),
          ),
        );
        // Skip photo and complete job in simulator
        await _skipDropoffPhotoAndComplete();
      }
    }
  }

  Future<void> _skipDropoffPhotoAndComplete() async {
    final job = _currentJob;
    if (job == null) return;

    try {
      await _fire.updateJob(job.id, {
        'status': 'completed',
        'completedAt': DateTime.now().toIso8601String(),
      });
      await _fire.setDriverOnline();
    } catch (_) {}

    setState(() => _state = DriverJobState.completed);
  }

  Future<void> _uploadDropoffPhotoAndComplete() async {
    final job = _currentJob;
    if (_dropoffPhotoFile == null || job == null) return;

    final url = await _storage.uploadJobPhoto(
      jobId: job.id,
      file: _dropoffPhotoFile!,
      kind: 'dropoff',
    );
    _dropoffPhotoUrl = url;

    try {
      await _fire.updateJob(job.id, {
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
          Positioned.fill(child: mb.MapWidget(onMapCreated: _onMapCreated)),

          // Top header (safe area)
          Positioned(
            top: topPad,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.55),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'Driver Dashboard',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
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
              currentJob: _currentJob,
              pickupPhotoReady: _pickupPhotoFile != null,
              dropoffPhotoReady: _dropoffPhotoFile != null,
              onAccept: _acceptJob,
              onArrivedPickup: _confirmPickupProximity,
              onTakePickupPhoto: _takePickupPhoto,
              onConfirmPickupPhoto: _uploadPickupPhoto,
              onSkipPickupPhoto: _skipPickupPhotoAndProceed,
              onArrivedDropoff: _confirmDropoffProximity,
              onTakeDropoffPhoto: _takeDropoffPhoto,
              onConfirmDropoffPhoto: _uploadDropoffPhotoAndComplete,
              onSkipDropoffPhoto: _skipDropoffPhotoAndComplete,
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
  final JobModel? currentJob;

  final bool pickupPhotoReady;
  final bool dropoffPhotoReady;

  final VoidCallback onAccept;
  final VoidCallback onArrivedPickup;
  final VoidCallback onTakePickupPhoto;
  final VoidCallback onConfirmPickupPhoto;
  final VoidCallback onSkipPickupPhoto;

  final VoidCallback onArrivedDropoff;
  final VoidCallback onTakeDropoffPhoto;
  final VoidCallback onConfirmDropoffPhoto;
  final VoidCallback onSkipDropoffPhoto;

  const _BottomPanel({
    required this.state,
    required this.instruction,
    required this.currentJob,
    required this.pickupPhotoReady,
    required this.dropoffPhotoReady,
    required this.onAccept,
    required this.onArrivedPickup,
    required this.onTakePickupPhoto,
    required this.onConfirmPickupPhoto,
    required this.onSkipPickupPhoto,
    required this.onArrivedDropoff,
    required this.onTakeDropoffPhoto,
    required this.onConfirmDropoffPhoto,
    required this.onSkipDropoffPhoto,
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
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
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
        actions.add(
          button('Skip Photo (Simulator)', onSkipPickupPhoto, enabled: true),
        );
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
        actions.add(
          button('Skip Photo (Simulator)', onSkipDropoffPhoto, enabled: true),
        );
        break;

      case DriverJobState.dropoffPhotoTaken:
        actions.add(const SizedBox.shrink());
        break;

      case DriverJobState.completed:
        actions.add(
          const Text(
            'Job Completed',
            style: TextStyle(color: Colors.greenAccent, fontSize: 16),
          ),
        );
        break;
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(16),
        color: Colors.black.withOpacity(0.60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Job Preview Card (only in idle state)
            if (state == DriverJobState.idle && currentJob != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.work_outline,
                          color: Colors.white70,
                          size: 18,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Job ${currentJob!.id.substring(0, 8)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(
                          Icons.place,
                          color: Colors.greenAccent,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Pickup: ${currentJob!.pickupDisplay}',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(
                          Icons.place,
                          color: Colors.redAccent,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Dropoff: ${currentJob!.dropoffDisplay}',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Status headline
            Text(
              headline,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            if (instruction != null) ...[
              const SizedBox(height: 6),
              Text(
                instruction!,
                style: const TextStyle(color: Colors.white54, fontSize: 12),
              ),
            ],
            const SizedBox(height: 12),
            ...actions,
          ],
        ),
      ),
    );
  }
}
