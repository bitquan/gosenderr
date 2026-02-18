# BAT-IOS-001 Execution Log

Date: 2026-02-18
BAT: BAT-IOS-001 (Lifecycle Command Audit and Closure)
Plan reference: `docs/senderr_app/IOS_EXECUTION_PLAN_2026-02-18.md`
System references:
- `SYSTEMS/SENDERR_IOS_SYSTEM.md`
- `SYSTEMS/BACKEND_FUNCTIONS_SYSTEM.md`
- `SYSTEMS/SHARED_CONTRACTS_SYSTEM.md`
- `SYSTEMS/RELEASE_GOVERNANCE_SYSTEM.md`

## Objective

Audit and close any iOS lifecycle paths that can mutate protected delivery status outside callable command pathways.

## Scope

In scope:
- `apps/courieriosnativeclean` lifecycle action entrypoints
- service adapters used by map shell/job actions
- transition guards and shared status vocabulary usage

Out of scope:
- visual redesign work
- unrelated feature additions

## Environment Runbook

### A) Required runtime for local parity checks

1. Start emulators (Auth + Firestore + Functions):

```bash
cd /Users/papadev/dev/worktrees/gosenderr/V1-senderrplace-local
bash scripts/start-emulators.sh
```

2. Start Metro for iOS app:

```bash
cd /Users/papadev/dev/worktrees/gosenderr/V1-senderrplace-local/apps/courieriosnativeclean
npx react-native start --reset-cache
```

3. Open and run iOS app from Xcode workspace:
- `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Scheme: `Senderr`

### B) Physical phone lane

Use same emulator + Metro requirements for local development (unless testing against production APIs intentionally).

If phone cannot reach Metro host, run:

```bash
cd /Users/papadev/dev/worktrees/gosenderr/V1-senderrplace-local/apps/courieriosnativeclean
npx react-native start --host 0.0.0.0 --port 8081 --reset-cache
```

## Checklist

- [ ] Inventory lifecycle mutation entrypoints in iOS code
- [ ] Verify each transition path routes through callable command
- [ ] Remove/guard direct protected status writes
- [ ] Confirm status vocabulary parity with shared contracts
- [ ] Run smoke for accept -> pickup -> dropoff -> complete
- [ ] Capture evidence and command outputs

## Findings Log

### 2026-02-18 — Initial pass

- Changes made:
  - _pending_
- Files touched:
  - _pending_
- Notes:
  - _pending_

## Test Evidence

### Automated

```bash
# add exact commands + results here
```

Result:
- _pending_

### Manual Smoke

Use `docs/senderr_app/SMOKE_CHECKLIST.md` and record outcomes here.

- Offer state:
  - _pending_
- Accepted/enroute pickup:
  - _pending_
- Picked up/enroute dropoff:
  - _pending_
- Proof-required state:
  - _pending_
- Offline reconnect state:
  - _pending_

Result:
- _pending_

## Device Matrix Entry

Copy from `docs/senderr_app/DEVICE_TEST_MATRIX.md` and fill after each run.

```md
### <Device> / iOS <Version> - 2026-02-18
- Build: Pass|Fail
- Launch: Pass|Fail
- Auth: Pass|Fail
- Jobs: Pass|Fail
- Location: Pass|Fail
- Firebase init: Pass|Fail
- Result: Pass|Fail|Blocked|N/A
- Issue links: #<id>
- Notes:
```

## BAT Exit Decision

- Status: _in-progress_
- Blockers:
  - _none recorded yet_
- Next action:
  - Begin lifecycle command path inventory in `apps/courieriosnativeclean`
