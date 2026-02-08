# Senderr iOS Offline Mode (Active Job Flow)

Last verified: 2026-02-07

## Goal

Keep core courier job progress usable with intermittent connectivity:

- Cache latest jobs locally
- Queue job-status writes while offline
- Flush queued writes on reconnect

## Implementation

File:

- `apps/courieriosnativeclean/src/services/jobsService.ts`

Storage keys:

- Jobs cache: `@senderr/jobs`
- Pending status queue: `@senderr/jobs/status-update-queue`

Behavior:

1. Jobs fetch from Firestore persists to local cache.
2. Job status update tries Firestore first.
3. If update fails with connectivity-style error, the update is queued and applied locally.
4. Queue flush runs on:
   - successful live snapshot (network recovered)
   - manual refresh
5. After flush success, jobs are re-fetched so UI reflects server truth.

## User-facing sync states

`JobsScreen` sync card now reflects queued update conditions via messages:

- `N job update(s) pending sync.`
- `Synced N queued job update(s).`

## Notes

- Queue dedupes by `sessionUid + jobId` (latest status wins).
- Production mode still requires valid Firebase configuration.
- Local fallback seed mode remains non-production only.
