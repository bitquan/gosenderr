enum DriverJobState {
  idle,
  enroutePickup,
  arrivedPickup,
  pickupPhotoTaken,
  enrouteDropoff,
  arrivedDropoff,
  dropoffPhotoTaken,
  completed,
}

extension DriverJobStateX on DriverJobState {
  String get label => toString().split('.').last;
}
