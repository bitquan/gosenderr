# Senderr iOS Device Test Matrix

Tracks iOS-native smoke coverage across target device and OS combinations.

## Target matrix

| Device | iOS 16 | iOS 17 | Notes |
| --- | --- | --- | --- |
| iPhone 12 | Pending | Pending | |
| iPhone 13 | Pending | Pending | |
| iPhone 14 | Pending | Pending | |
| iPhone 15 | N/A | Pending | iOS 16 not supported on iPhone 15 |

Status values:
- `Pending`
- `Pass`
- `Fail`
- `Blocked`
- `N/A` (device/OS combo not applicable)

## Test pass checklist (run per device/OS row)

1. Build app from canonical workspace:
   - `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
2. Launch app and confirm initial shell loads.
3. Verify auth flow:
   - login
   - logout
4. Verify jobs flow:
   - jobs list loads
   - job detail opens
   - status action updates locally
5. Verify location flow:
   - permission prompt appears
   - app handles allow/deny without crash
6. Verify Firebase config behavior:
   - no `FirebaseApp.configure` fatal at launch

## Execution log template

Copy this block for each matrix row you test.

```md
### <Device> / iOS <Version> - <Date>
- Build: Pass|Fail
- Launch: Pass|Fail
- Auth: Pass|Fail
- Jobs: Pass|Fail
- Location: Pass|Fail
- Firebase init: Pass|Fail
- Result: Pass|Fail|Blocked|N/A
- Issue links: #<id>, #<id>
- Notes:
```

## Issue logging rules

- Create a GitHub issue for every reproducible failure.
- Use labels:
  - `scope:courier`
  - `priority:p2` (or `priority:p1` if blocking release)
- Link the issue in this matrix under `Issue links`.
