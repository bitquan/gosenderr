# Phase 2 Enablement Checklist

This checklist covers the operational steps for Issue #13 (Enable Core Features).

## Feature Flag Enablement

- [ ] Confirm /admin/feature-flags is accessible to admin users
- [ ] Set **customer.packageShipping = true**
- [ ] Set **delivery.routes = true**
- [ ] Verify /ship loads without the “disabled” message
- [ ] Verify /courier/routes loads without the “disabled” message

## Beta Testing

- [ ] Identify 5–10 test users (customers + couriers)
- [ ] Provide testing script (shipping flow + route acceptance)
- [ ] Collect feedback and note UX issues

## Monitoring

- [ ] Watch Cloud Function logs for errors
- [ ] Monitor Firestore for failed writes
- [ ] Track payment intent creation errors (Stripe)
- [ ] Review Firebase Hosting logs for 500s

## Post-Enablement

- [ ] Summarize findings in docs/PROJECT_STATUS.md
- [ ] Triage critical bugs and create issues
