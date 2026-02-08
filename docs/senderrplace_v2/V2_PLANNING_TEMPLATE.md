# Senderrplace V2 Planning Template

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-09`
> - Review cadence: `weekly`

Use this template before opening implementation PRs for Senderrplace V2 features.

## 1. Feature Brief

- Feature name:
- Problem statement:
- Target users:
- Why now:
- Out of scope:

## 2. Role Scope Matrix

Define explicit scope per role for this feature.

- Customer capabilities added/changed:
- Seller capabilities added/changed:
- Courier capabilities added/changed:
- Admin capabilities added/changed:
- Role-specific access rules:
- Role-specific blocked actions:

## 3. Commerce Modes and Account Model

Define how this feature supports blended customer/seller behavior.

- Local selling enabled:
- Cross-city/remote selling enabled:
- Can a customer also act as a seller in same account: `yes/no`
- Role switch UX path:
- Seller eligibility requirements:
- Seller-to-customer handoff UX:
- Data ownership model for dual-role accounts:

## 4. Onboarding Matrix

Define onboarding impact per role.

- Customer onboarding entry:
- Seller onboarding entry:
- Courier onboarding dependency:
- Admin setup dependency:
- Required onboarding steps:
- Profile completion requirements:
- Verification requirements (identity, payout, tax, phone, email):
- First successful action per role:
- Onboarding drop-off events to track:

## 5. User Flows

List exact user journeys.

- Primary flow:
- Alternate flow:
- Failure flow:

For each flow define:

- Entry point:
- Preconditions:
- Steps:
- Success state:
- Error state:

## 6. Domain Contract

Define or update canonical entities.

- Entities touched:
- New fields:
- Field validation rules:
- Ownership (client vs functions):
- State machine transitions:

Required for food-delivery features:

- merchant/restaurant identity model
- pickup confirmation number format and validation
- booking availability decision source
- seller-shareable delivery booking link contract
- booking link expiration/revocation rules

## 7. Availability and Guardrails

Define hard gates that must pass before booking.

- Courier availability rule:
- Service radius rule:
- Equipment rule:
- Time-window rule:
- Capacity/concurrency rule:
- Hold/expiration rule:

Define fail-fast behavior:

- User-visible fallback when unavailable:
- Retry policy:

## 8. Pricing and Payment Contract

- Food rate card rules:
- Package rate card rules:
- Stripe usage mode for this flow: `required/optional/disabled`
- Non-Stripe payment mode (if optional):
- Delivery booking independent of Stripe: `yes/no`
- Surge/peak logic:
- Platform fee rules:
- Payout split rules:
- Refund/dispute rules:
- Capture timing (auth vs capture):
- Failure/rollback behavior:

## 9. Monetization and Ads

- Ad inventory model (placement + ownership):
- Seller ad products (boosted listing, featured slot, sponsored result):
- Ad eligibility requirements:
- Ad pricing model:
- Budget caps / pacing rules:
- Ad disclosure policy in UI:
- Abuse/spam controls for ads:
- Ads analytics contract:

## 10. API and Function Changes

- Functions to add/change:
- Input/output contract:
- Idempotency strategy:
- AuthZ checks:
- Firestore rules impact:

## 11. Data Model and Migrations

- Collections/docs changed:
- Backfill required:
- Migration script needed:
- Rollback strategy:

## 12. UI/UX Contract

- Screens/components touched:
- Feature flags used:
- Empty/loading/error states:
- Accessibility requirements:
- Analytics events:
- Badge model (seller/customer trust, quality, compliance):
- Badge assignment source (rules/manual/admin override):
- Badge visibility rules:
- Senderr app visual parity requirements:
- Senderr Web visual parity requirements:

## 13. Trust and Safety

- Abuse vectors considered:
- Duplicate/invalid confirmation defense:
- No-courier-available handling:
- Fraud/risk checks:
- Audit logging requirements:
- Abuse controls for public seller booking links:

## 14. Testing Plan

Minimum required:

- Unit tests:
- Integration tests:
- E2E tests:
- Emulator test scenario:
- Manual QA checklist:
- Dual-role account QA scenario (customer + seller):
- Seller link booking QA scenario:
- Stripe-optional booking QA scenario:
- Badge eligibility/assignment QA scenario:
- Feature-flag off-path QA scenario:

## 15. Observability

- Logs added:
- Metrics added:
- Alerts added:
- Dashboard/monitoring links:

## 16. Rollout Plan

- Flag name(s):
- Rollout stages:
- Entry criteria per stage:
- Exit criteria per stage:
- Instant rollback procedure:
- Feature flag owner:
- Default flag state in prod:

## 17. Dependencies and Risks

- External dependencies:
- Internal dependencies:
- Top 3 risks:
- Mitigations:

## 18. Issues and PR Breakdown

- Epic issue:
- Child issues:
- Target branches:
- PR order:
- Merge gates:

Required PR checklist item:

- Select exactly one handoff option in PR template:
- `handoff: updated` or `handoff: not needed`

## 19. Acceptance Criteria

Functional:

- [ ] Flow works end-to-end
- [ ] No booking when availability fails
- [ ] Confirmation number rules enforced
- [ ] Customer onboarding works end-to-end
- [ ] Seller onboarding works end-to-end
- [ ] Role permissions are enforced correctly
- [ ] Dual-role account flow works (same user as customer + seller)
- [ ] Seller share-link booking works with guardrails
- [ ] Booking can run without Stripe when Stripe is optional
- [ ] Seller ad purchase + placement works with guardrails
- [ ] Badge assignment and visibility rules are enforced
- [ ] Admin controls are delivered in Admin Web only (no desktop dependency)

Operational:

- [ ] Tests pass in CI
- [ ] Docs updated
- [ ] Feature flags documented
- [ ] Monitoring in place
