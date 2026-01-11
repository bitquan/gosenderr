# GoSenderr Driver Pack (Firebase Auth + Firestore + Storage)

This pack fixes your current blockers:
- Firestore permission-denied
- Storage unauthorized on pickup/dropoff photo uploads
- Clean driver state machine flow (idle -> pickup -> dropoff -> completed)
- Safe map rendering + route drawing for Mapbox Maps Flutter 2.x

## 1) Apply Firebase Rules (required)
### Firestore
Deploy `firebase/firestore.rules` to Firestore rules.

### Storage
Deploy `firebase/storage.rules` to Storage rules.

> If you're using the Firebase CLI, copy these files into your repo's `firebase/` folder and run:
> - `firebase deploy --only firestore:rules`
> - `firebase deploy --only storage`

## 2) IMPORTANT: Plugin crash / MissingPluginException
If you see:
`MissingPluginException(No implementation found for method annotation#create_manager ...)`

That usually means **hot restart after plugin changes** or **running on a platform that doesn't support the plugin**.
Fix:
- Stop the app completely
- `flutter clean`
- `flutter pub get`
- Run again on **iOS / Android** (not web)

## 3) Drop-in Flutter files
Copy the `lib/` folder contents from this pack into your project (merge/overwrite).

You'll need these dependencies in pubspec.yaml:
- mapbox_maps_flutter
- flutter_riverpod
- geolocator
- image_picker
- firebase_core
- firebase_auth
- cloud_firestore
- firebase_storage

(If you're missing any, add them and do a full restart.)

