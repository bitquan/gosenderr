class JobModel {
  final String id;
  final double pickupLat;
  final double pickupLng;
  final String? pickupLabel;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? dropoffLabel;
  final String requiredVehicle;
  final String title;
  final String status;
  final String? assignedDriverUid;

  JobModel({
    required this.id,
    required this.pickupLat,
    required this.pickupLng,
    this.pickupLabel,
    this.dropoffLat,
    this.dropoffLng,
    this.dropoffLabel,
    required this.requiredVehicle,
    required this.title,
    required this.status,
    this.assignedDriverUid,
  });

  factory JobModel.fromFirestore(String id, Map<String, dynamic> data) {
    double? tryParseNum(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      try {
        return double.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    final pickup = data['pickup'] as Map<String, dynamic>?;
    final dropoff = data['dropoff'] as Map<String, dynamic>?;

    // Debug logging
    print('📦 Parsing job $id: pickup=$pickup, dropoff=$dropoff');

    return JobModel(
      id: id,
      pickupLat: pickup != null ? (pickup['lat'] as num).toDouble() : 0.0,
      pickupLng: pickup != null ? (pickup['lng'] as num).toDouble() : 0.0,
      pickupLabel: pickup?['label'] as String?,
      dropoffLat: tryParseNum(dropoff?['lat']),
      dropoffLng: tryParseNum(dropoff?['lng']),
      dropoffLabel: dropoff?['label'] as String?,
      requiredVehicle: data['requiredVehicle'] as String? ?? '',
      title: data['title'] as String? ?? '',
      status: data['status'] as String? ?? 'open',
      assignedDriverUid: data['assignedDriverUid'] as String?,
    );
  }

  String get pickupDisplay => pickupLabel ?? '$pickupLat, $pickupLng';
  String get dropoffDisplay =>
      dropoffLabel ?? '${dropoffLat ?? 0}, ${dropoffLng ?? 0}';
}
