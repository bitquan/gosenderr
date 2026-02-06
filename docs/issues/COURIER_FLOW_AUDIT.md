# Courier Flow Audit (Issue Draft)

## Summary
The courier experience has multiple overlapping job detail screens and inconsistent status semantics. The current “Active Delivery” view mixes timeline, map, and actions, but allows navigation actions that don’t align with the status flow and presents status labels that do not match the actual transition logic. This creates confusion for couriers and makes it harder to guide them through the correct steps.

## Scope Reviewed
- Courier job detail (new): [apps/senderr-app/src/pages/jobs/[jobId]/page.tsx](apps/senderr-app/src/pages/jobs/%5BjobId%5D/page.tsx)
- Courier job actions: [apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx](apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx)
- Courier status timeline: [apps/senderr-app/src/components/v2/StatusTimeline.tsx](apps/senderr-app/src/components/v2/StatusTimeline.tsx)
- Courier legacy job detail: [apps/senderr-app/src/pages/JobDetail.tsx](apps/senderr-app/src/pages/JobDetail.tsx)
- Courier live trip UI (unused in courier app view): [apps/senderr-app/src/components/v2/LiveTripStatus.tsx](apps/senderr-app/src/components/v2/LiveTripStatus.tsx)

## Key Findings
1) Duplicate job detail screens with different status semantics
- The courier app has two job detail screens: the new route in [apps/senderr-app/src/pages/jobs/[jobId]/page.tsx](apps/senderr-app/src/pages/jobs/%5BjobId%5D/page.tsx) and the legacy page in [apps/senderr-app/src/pages/JobDetail.tsx](apps/senderr-app/src/pages/JobDetail.tsx).
- The legacy page uses status values like `in_progress` and `pending`, while the current flow uses `enroute_pickup`, `arrived_pickup`, `picked_up`, `enroute_dropoff`, `arrived_dropoff`, `completed`. This mismatch results in conflicting UI messaging and flow logic.

2) Status timeline labels do not match action button labels
- Timeline labels in [apps/senderr-app/src/components/v2/StatusTimeline.tsx](apps/senderr-app/src/components/v2/StatusTimeline.tsx) are generic, while the action button in [apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx](apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx) uses more directive verbs (Start Heading, Mark Arrived, Mark Picked Up, etc.).
- This creates a “what do I do next?” gap because the timeline doesn’t mirror the actual next action.

3) Navigation actions are not gated by status
- The “Navigate to Pickup” and “Navigate to Dropoff” buttons in [apps/senderr-app/src/pages/jobs/[jobId]/page.tsx](apps/senderr-app/src/pages/jobs/%5BjobId%5D/page.tsx) are always enabled (only disabled by missing location), even before pickup is complete.
- This makes the flow feel unordered and allows a courier to navigate to dropoff before pickup or before the system considers them en route.

4) Live trip component duplication and unclear usage
- The courier app includes a full LiveTripStatus component with a richer status narrative and proof photos, but the courier screen currently uses a separate timeline and action button.
- This fragmenting of UI logic increases confusion and maintenance costs.

5) Payment gating is visible but not contextualized
- The banner in [apps/senderr-app/src/pages/jobs/[jobId]/page.tsx](apps/senderr-app/src/pages/jobs/%5BjobId%5D/page.tsx) blocks actions when payment isn’t authorized, but the timeline still shows progress as if it can advance.
- The “Progress” card should reflect the locked state (e.g., show a “Waiting for Payment” milestone, or disable next step).

## Proposed Direction
- Single source of truth for courier job detail: keep the new route and remove or redirect the legacy page.
- Unify status labels and transitions across timeline and actions.
- Gate navigation actions based on current status (pickup navigation only after `assigned`; dropoff navigation only after `picked_up`).
- Reuse LiveTripStatus or bring its richer narrative (status header, proof photos) into the courier flow to reduce UI fragmentation.
- Add payment lock state into the timeline and action area so it’s visually consistent.

## Action Items
- [ ] Remove or redirect legacy page [apps/senderr-app/src/pages/JobDetail.tsx](apps/senderr-app/src/pages/JobDetail.tsx)
- [ ] Align `StatusTimeline` labels with `CourierJobActions` next-step labels
- [ ] Add status gating to navigation buttons
- [ ] Decide: adopt `LiveTripStatus` for courier or refactor current screen to use its layout
- [ ] Add “Waiting for Payment” state to progress UI

## Acceptance Criteria
- Only one courier job detail screen exists in production routes.
- Timeline labels match action button next-step labels for every status.
- Navigation buttons are disabled unless the courier has reached the relevant stage.
- Payment lock visibly halts progress and explains the wait.
- UX walkthrough confirms the flow from `assigned` → `completed` is clear and linear.
