import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/job_model.dart';

class JobsService {
  final _db = FirebaseFirestore.instance;

  Stream<List<JobModel>> openJobsStream() {
    return _db
        .collection('jobs')
        .where('status', isEqualTo: 'open')
        .snapshots()
        .map((snapshot) {
          // Debug: confirm number of jobs fetched from Firestore
          // ignore: avoid_print
          print('🔥 JOBS SNAPSHOT: ${snapshot.docs.length}');

          return snapshot.docs.map((doc) {
            return JobModel.fromFirestore(doc.id, doc.data());
          }).toList();
        });
  }
}
