import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'auth_state.dart';

final userRoleProvider = StreamProvider<String?>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return const Stream.empty();

  return FirebaseFirestore.instance
      .collection('users')
      .doc(auth.uid)
      .snapshots()
      .map((snap) => snap.data()?['role'] as String?);
});
