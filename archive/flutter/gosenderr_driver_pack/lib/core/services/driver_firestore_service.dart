import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class DriverFirestoreService {
  final _db = FirebaseFirestore.instance;
  final _auth = FirebaseAuth.instance;

  String get uid => _auth.currentUser!.uid;

  DocumentReference<Map<String, dynamic>> driverDoc() =>
      _db.collection('drivers').doc(uid);

  DocumentReference<Map<String, dynamic>> jobDoc(String jobId) =>
      _db.collection('jobs').doc(jobId);

  Future<void> setDriverOnline() async {
    await driverDoc().set({
      'status': 'online',
      'activeJobId': null,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<void> setDriverOffline() async {
    await driverDoc().set({
      'status': 'offline',
      'activeJobId': null,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<void> setDriverBusy(String jobId) async {
    await driverDoc().set({
      'status': 'busy',
      'activeJobId': jobId,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  /// Claim job: open -> assigned, driverId=self
  Future<void> claimJob(String jobId) async {
    await _db.runTransaction((tx) async {
      final ref = jobDoc(jobId);
      final snap = await tx.get(ref);
      final data = snap.data() ?? {};
      final status = data['status'];
      if (status != 'open') {
        throw Exception('Job is not open (status=$status)');
      }
      tx.update(ref, {
        'status': 'assigned',
        'driverId': uid,
        'assignedAt': FieldValue.serverTimestamp(),
      });
    });
    await setDriverBusy(jobId);
  }

  Future<void> updateJob(String jobId, Map<String, dynamic> patch) async {
    await jobDoc(jobId).set({
      ...patch,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }
}
