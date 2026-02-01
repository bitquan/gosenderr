# 📈 Production Monitoring & Alerting (Baseline)

> **Purpose:** Minimal, production-ready observability setup for GoSenderr.

## Goals

- Detect outages and elevated error rates quickly.
- Track critical latency and queue backlogs.
- Maintain a lightweight, repeatable baseline for new environments.

## Required Services (Firebase + GCP)

- **Google Cloud Logging** (Firebase Functions logs)
- **Google Cloud Monitoring** (alerting + dashboards)
- **Firebase Crash & Error Reporting** (client-side visibility if enabled)

## Baseline Alert Policies

Create the following alert policies in Google Cloud Monitoring for the Firebase project:

### 1) Cloud Functions error rate
- **Signal:** Functions error logs / executions
- **Trigger:** Error rate ≥ 2% for 5 minutes
- **Applies to:** HTTP + callable functions

### 2) Cloud Functions latency
- **Signal:** 95th percentile latency
- **Trigger:** p95 ≥ 3s for 5 minutes

### 3) Cloud Functions invocation failures
- **Signal:** Execution failures
- **Trigger:** ≥ 10 failures in 5 minutes

### 4) Hosting 5xx spikes (public apps)
- **Signal:** Hosting requests with 5xx
- **Trigger:** ≥ 5% for 5 minutes
- **Targets:** marketplace, courier, admin hosting sites

### 5) Firestore usage anomalies
- **Signal:** Document reads/writes per minute
- **Trigger:** Sudden 3x spike (use baseline once stable)

### 6) Auth sign-in failure spikes
- **Signal:** Auth sign-in errors
- **Trigger:** ≥ 10 errors in 5 minutes

## Uptime Checks

Create uptime checks for public endpoints:

- Marketplace: https://gosenderr-marketplace.web.app
- Courier: https://gosenderr-courier.web.app
- Admin: https://gosenderr-admin.web.app
- Landing: https://gosenderr-6773f.web.app
- Functions health endpoint (recommended):
  - `GET /getSystemStats` or a dedicated `/health` endpoint

**Trigger:** 2 consecutive failures over 2 minutes.

## Dashboards (Minimum)

Create a “GoSenderr Production” dashboard with:

- Functions error count + latency
- Hosting 5xx + total requests
- Firestore reads/writes
- Auth sign-in errors

## Notification Channels

Configure alert notifications for:

- Email distribution list (on-call)
- Slack channel (if available)

**Policy:** alerts must notify at least 2 channels.

## Verification Checklist

- [ ] Alerts created for functions errors + latency.
- [ ] Hosting 5xx alert created for all public apps.
- [ ] Firestore usage anomaly alert created.
- [ ] Auth failure spike alert created.
- [ ] Uptime checks for all public URLs.
- [ ] Dashboard created and shared.
- [ ] Test alert fired and acknowledged.

## Operational Notes

- Use `firebase functions:log` for quick, local triage.
- Store any alert runbooks in a shared location and link them in alert descriptions.
