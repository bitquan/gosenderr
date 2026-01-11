import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'auth_state.dart';

final driverProfileProvider = StreamProvider<DocumentSnapshot?>((ref) {
  final user = ref.watch(authStateProvider).value;
  if (user == null) return const Stream.empty();

  return FirebaseFirestore.instance
      .collection('drivers')
      .doc(user.uid)
      .snapshots();
});
