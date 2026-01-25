---
name: In-App Navigation Enhancement
about: Implement native turn-by-turn navigation in courier app
title: '[FEATURE] Implement In-App Turn-by-Turn Navigation for Courier'
labels: enhancement, courier-app, navigation, p1
assignees: ''
---

## 🎯 Objective
Replace external Google Maps navigation with in-app turn-by-turn navigation using Mapbox Directions API to provide a seamless delivery experience for couriers.

## 📋 Current State

### What Currently Exists
- ✅ Mapbox GL JS map integration with live courier location tracking
- ✅ Pulsing blue location marker with real-time updates
- ✅ Route visualization (courier → pickup → dropoff) with colored segments
- ✅ Mapbox Directions API integration (`/lib/navigation/directions.ts`)
- ✅ Job status workflow with step-by-step progression
- ✅ Basic navigation types defined (`/lib/navigation/types.ts`)
- ✅ External Google Maps links for navigation (current workaround)

### What's Missing
- ❌ In-app turn-by-turn navigation UI
- ❌ Step-by-step instruction display
- ❌ Voice guidance integration
- ❌ Automatic rerouting on deviation
- ❌ ETA updates and distance-to-turn indicators
- ❌ Navigation-specific map styling (zoomed, auto-rotating)
- ❌ Background location tracking during navigation

## 🏗️ Technical Architecture

### Phase 1: Navigation UI Foundation
**Priority: P0 (Critical)**

#### 1.1 Navigation Context & State Management
Create `/contexts/NavigationContext.tsx`:
```typescript
interface NavigationState {
  isNavigating: boolean
  currentStep: RouteStep | null
  remainingSteps: RouteStep[]
  distanceToNextTurn: number
  estimatedTimeRemaining: number
  currentRoute: RouteData | null
}
```

**Files to Create:**
- `apps/courier-app/src/contexts/NavigationContext.tsx`
- `apps/courier-app/src/hooks/useNavigation.ts`

#### 1.2 Navigation UI Components
Create reusable navigation components:

**Files to Create:**
- `apps/courier-app/src/components/navigation/NavigationHeader.tsx`
  - Current instruction display
  - Distance to next turn
  - ETA and distance remaining
  
- `apps/courier-app/src/components/navigation/NavigationMap.tsx`
  - Map with navigation-specific styling
  - Auto-follow mode (zoom 17-18)
  - Overview camera toggle (show full route)
  - Bearing/rotation based on travel direction
  - Highlighted current segment
  
- `apps/courier-app/src/components/navigation/StepList.tsx`
  - Upcoming turns preview
  - Maneuver icons
  - Distance indicators

**Estimated Time:** 8-12 hours

---

### Phase 2: Navigation Flow Integration
**Priority: P0 (Critical)**

#### 2.1 Start Navigation Flow
Modify job detail page to launch in-app navigation:

**Files to Modify:**
- `apps/courier-app/src/pages/jobs/[jobId]/page.tsx`
  - Replace Google Maps links with "Start Navigation" button
  - Initialize navigation context when starting trip
  - Transition to full-screen navigation view

#### 2.2 Full-Screen Navigation View
Create new dedicated navigation page:

**Files to Create:**
- `apps/courier-app/src/pages/navigation/active.tsx`
  - Full-screen map view
  - Floating instruction card at top
  - Bottom action buttons (exit, recenter, overview toggle)
  - Minimal UI for focus
  - Camera mode state (follow vs overview)

**Route to Add:**
- `/navigation/active` - Active navigation view

**Estimated Time:** 6-8 hours

---

### Phase 3: Real-Time Position Tracking
**Priority: P1 (High)**

#### 3.1 Location-Based Step Progression
**Files to Modify:**
- `apps/courier-app/src/hooks/v2/useCourierLocationWriter.ts`
  - Add navigation mode with higher update frequency (1-2 seconds)
  - Calculate distance to next maneuver
  - Trigger step transitions automatically

#### 3.2 Progress Tracking
**New Hook to Create:**
- `apps/courier-app/src/hooks/useNavigationProgress.ts`
  - Track progress along route geometry
  - Calculate bearing/heading
  - Detect waypoint arrivals (within 20-30 meters)
  - Update ETA based on current speed

**Estimated Time:** 6-10 hours

---

### Phase 4: Automatic Rerouting
**Priority: P1 (High)**

#### 4.1 Off-Route Detection
**Files to Create:**
- `apps/courier-app/src/lib/navigation/rerouting.ts`
  - Calculate perpendicular distance from route
  - Threshold: 50 meters off-route → trigger reroute
  - Debounce reroute requests (5 seconds minimum)

#### 4.2 Reroute Integration
**Files to Modify:**
- `apps/courier-app/src/hooks/useMapboxDirections.ts`
  - Add `rerouteFromCurrentLocation()` method
  - Clear cache on reroute
  - Preserve destination waypoints

**Estimated Time:** 4-6 hours

---

### Phase 5: Voice Guidance (Optional)
**Priority: P2 (Medium)**

#### 5.1 Voice Instruction Preparation
**Files to Modify:**
- `apps/courier-app/src/lib/navigation/directions.ts`
  - Enable `voiceInstructions: true` in Directions API call
  - Parse voice instruction data from API response

#### 5.2 Text-to-Speech Integration
**Files to Create:**
- `apps/courier-app/src/lib/navigation/voice.ts`
  - Use Web Speech API or external TTS service
  - Queue and play voice instructions at appropriate distances
  - Handle interruptions and replays

**Estimated Time:** 4-6 hours

---

### Phase 6: Enhanced Map Features
**Priority: P2 (Medium)**

#### 6.1 Map Rotation & Camera Control
**Files to Create:**
- `aToggle between follow mode (zoom 17-18) and overview mode (full route visible)
  - Auto-rotate map based on bearing (follow mode only)
  - Smooth camera transitions between modes
  - Pitch adjustment (3D perspective)
  - FitBounds to entire route in overview mode
  - Pitch adjustment (3D perspective)
  
#### 6.2 Maneuver Icons & Lane Guidance
**Assets to Add:**
- `apps/courier-app/public/navigation-icons/`
  - Turn-left.svg, turn-right.svg
  - Slight-left.svg, slight-right.svg
  - Merge.svg, roundabout.svg
  - Arrive.svg, depart.svg

**Files to Create:**
- `apps/courier-app/src/components/navigation/ManeuverIcon.tsx`
  - Dynamic icon based on maneuver type
  - Animated directional indicators

**Estimated Time:** 3-5 hours

---

## 🔄 Migration Strategy

### Immediate Actions (Keep Current System Working)
1. **DO NOT remove Google Maps links** until in-app navigation is fully tested
2. Add feature flag: `ENABLE_IN_APP_NAVIGATION` in `firebase/functions/featureFlags`
3. Run both systems in parallel during beta testing

### Rollout Plan
1. **Week 1-2:** Phase 1 & 2 (Basic navigation UI)
2. **Week 3:** Phase 3 (Real-time tracking)
3. **Week 4:** Phase 4 (Rerouting) + Testing
4. **Week 5:** Phase 5 & 6 (Enhancements) + Beta testing
5. **Week 6:** Production rollout with feature flag

---

## 📁 File Structure Overview

```
apps/courier-app/src/
├── contexts/
│   └── NavigationContext.tsx         [NEW]
├── hooks/
│   ├── useNavigation.ts              [NEW]
│   ├── useNavigationProgress.ts      [NEW]
│   ├── useNavigationCamera.ts        [NEW]
│   ├── useMapboxDirections.ts        [MODIFY]
│   └── v2/
│       └── useCourierLocationWriter.ts [MODIFY]
├── components/
│   └── navigation/
│       ├── NavigationHeader.tsx       [NEW]
│       ├── NavigationMap.tsx          [NEW]
│       ├── StepList.tsx               [NEW]
│       └── ManeuverIcon.tsx           [NEW]
├── pages/
│   ├── navigation/
│   │   └── active.tsx                 [NEW]
│   └── jobs/[jobId]/
│       └── page.tsx                   [MODIFY]
├── lib/
│   └── navigation/
│       ├── directions.ts              [MODIFY]
│       ├── types.ts                   [MODIFY]
│       ├── rerouting.ts               [NEW]
│       └── voice.ts                   [NEW - Optional]
└── public/
    └── navigation-icons/              [NEW]
        ├── turn-left.svg
        ├── turn-right.svg
        └── ... (more icons)
```

---

## ✅ Acceptance Criteria

### Must Have (P0)
- [ ] Courier can start in-app navigation from job detail page
- [ ] Full-screen navigation view with map and instructions
- [ ] Turn-by-turn instructions display correctly
- [ ] Real-time position updates during navigation
- [ ] Automatic step progression based on location
- [ ] ETA and distance calculations
- [ ] Exit navigation returns to job detail page
- [ ] Navigation survives app backgrounding (iOS/Android)

### Should Have (P1)
- [ ] Automatic rerouting when off-route (>50m)
- [ ] Overview/Follow mode toggle button
- [ ] Overview mode shows entire route with bounds
- [ ] Maneuver icons for each instruction type
- [ ] "Recenter" button to re-follow location (in overview mode)
- [ ] Maneuver icons for each instruction type
- [ ] "Recenter" button to re-follow location
- [ ] Waypoint arrival detection (pickup/dropoff)

### Nice to Have (P2)
- [ ] Voice guidance (TTS instructions)
- [ ] Map bearing/rotation based on heading
- [ ] 3D map perspective during navigation
- [ ] Lane guidance for complex intersections
- [ ] Speed limit display (if available)
- [ ] Traffic-aware rerouting

---

## 🧪 Testing Plan

### Unit Tests
- Navigation state management
- Distance calculations
- Off-route detection logic
- Step progression algorithms

### Integration Tests
- Complete navigation flow (start to finish)
- Rerouting scenarios
- Background location tracking
- Network interruption handling

### Manual QA Checklist
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test with GPS disabled (error handling)
- [ ] Test with poor network (offline graceful degradation)
- [ ] Test battery impact (optimize tracking frequency)
- [ ] Test with multiple waypoints (multi-stop routes)

---

## 📊 Success Metrics

### Performance
- Map render time: < 2 seconds
- Turn instruction latency: < 500ms from position update
- Battery drain: < 5% per 30 minutes of navigation

### User Experience
- 95% completion rate for navigation sessions
- < 2% premature exit rate
- Zero crashes related to navigation
- Average time to start navigation: < 3 seconds

---

## 🚨 Known Challenges & Mitigations

### Challenge 1: Battery Drain
**Mitigation:** 
- Use adaptive location tracking frequency
- Reduce to 5-second updates when far from turns
- Increase to 1-second updates near maneuvers

### Challenge 2: Background Tracking (Mobile)
**Mitigation:**
- Investigate PWA background geolocation capabilities
- Consider native wrapper for production (Capacitor/Cordova)
- Fallback: Foreground-only with screen-wake lock

### Challenge 3: API Rate Limits
**Mitigation:**
- Cache routes aggressively
- Batch reroute requests (5-second debounce)
- Monitor Mapbox API usage

---

## 🔗 Related Resources

### Documentation
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [Mapbox GL JS Camera Control](https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions)
- [Web Speech API (TTS)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

### Existing Code References
- Current route visualization: `apps/courier-app/src/components/v2/MapboxMap.tsx`
- Directions hook: `apps/courier-app/src/hooks/useMapboxDirections.ts`
- Location tracking: `apps/courier-app/src/hooks/v2/useCourierLocationWriter.ts`

---

## 💬 Implementation Notes for Next Developer

### Starting Point
1. **DO NOT** touch the existing Google Maps navigation yet
2. Start with Phase 1 (Navigation Context) - it's self-contained
3. Test location tracking frequency in `useCourierLocationWriter` first
4. Use feature flag to toggle between old/new navigation

### Quick Wins
- The Directions API already returns step-by-step instructions
- Map auto-follow is partially implemented in current MapboxMap
- GPS tracking is already working - just needs navigation mode

### Watch Out For
- iOS requires HTTPS and user permission for background location
- Map bearing rotation can cause motion sickness - make it optional
- Voice instructions need audio focus management (pause music, etc.)

### Testing Locally
```bash
# Start courier app
cd apps/courier-app
pnpm dev

# Enable navigation feature flag
# In browser console:
localStorage.setItem('ENABLE_IN_APP_NAVIGATION', 'true')
```

---

## 📝 Definition of Done

- [ ] All P0 acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Manual QA completed
- [ ] Documentation updated
- [ ] Feature flag enabled in staging
- [ ] Beta tested with 5+ real couriers
- [ ] Performance benchmarks met
- [ ] Deployed to production behind feature flag
- [ ] Monitoring dashboards configured

---

**Estimated Total Time:** 31-47 hours (1-2 sprint cycles)
**Priority:** P1 (High)
**Target Release:** Sprint 3-4 (Q1 2026)
