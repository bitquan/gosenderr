# Senderr iOS Navigation Map

## Entry routing
- App launch -> restore auth session
- If no session -> `Login`
- If session exists -> tab shell (`Dashboard`, `Jobs`, `Settings`)

## Primary tabs
1. `Dashboard`
- Courier summary
- Active jobs count
- Location tracking controls

2. `Jobs`
- Assigned jobs list
- Pull-to-refresh list data
- Tap row -> `Job Detail`

3. `Settings`
- Account summary
- Sign out action
- Location permission controls

## Secondary route
- `Job Detail`
- Back action returns to Jobs list
- Status action advances lifecycle (`pending -> accepted -> picked_up -> delivered`)

## Notes
- Current shell uses app-level state routing (no external navigation package).
- Structure is intentionally simple for MVP and can be migrated to navigation library later without changing screen contracts.
