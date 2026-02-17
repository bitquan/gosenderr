# Runbook — Migrate legacy `courierId` → `courierUid`

Purpose
- Safely remove legacy `courierId` fields and ensure all documents use `courierUid`.

Scope
- Collections scanned by migration script: `jobs`, `orders`, `marketplaceOrders`, `routes`, `jobPhotos`, `deliveryJobs`.

Pre-requisites (production run)
1. Full Firestore export (backup) and verify integrity.
2. Schedule maintenance window and notify stakeholders.
3. Ensure service accounts and CI have correct permissions.
4. Deploy code that supports both `courierId` and `courierUid` (feature-flagged if needed).

Steps (emulator/CI)
1. Start Firebase emulators and seed data (existing CI e2e flow does this).
2. Run (dry-run) to preview changes: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-courierid-to-courieruid.js --dry-run`
3. Verify results using `scripts/verify-migration-courierid.js` or Playwright test `migration-courierid.spec.ts`.
4. Run real migration in emulator: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-courierid-to-courieruid.js --remove-old`

Steps (production - OPERATOR ONLY)
1. Export production Firestore bucket with `gcloud`/`firebase` export and store backup.
2. Run migration in a staging environment first (mirror production dataset slice if possible).
3. Run migration with `--remove-old` in production during maintenance window.
   - Use `--force` if necessary (explicitly acknowledge risk).
4. Run verification script and smoke-tests (Playwright e2e).
5. After successful verification, remove legacy `courierId` acceptance from security rules and deploy.

Post-migration checks
- Run full E2E and regression suites.
- Monitor error budgets, logging, and user reports for 24–48 hours.
- Confirm no code writes `courierId` in new commits (add lint/test guard if possible).

Rollback
- Restore Firestore from backup if critical errors occur.

Safety & Notes
- This script requires `FIRESTORE_EMULATOR_HOST` by default; use `--force` to run against live projects.
- Never run `--remove-old` in production without a prior backup and approval.

Commands
- Dry run: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-courierid-to-courieruid.js --dry-run`
- Remove legacy: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-courierid-to-courieruid.js --remove-old`
- Verify: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/verify-migration-courierid.js`