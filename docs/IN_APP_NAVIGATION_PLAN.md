# In-App Navigation Implementation Plan

## 🎯 Executive Summary

This document outlines the plan to replace external Google Maps navigation with native in-app turn-by-turn navigation for the courier app using Mapbox Directions API.

**Status:** Planning Phase  
**Priority:** P1 (High)  
**Estimated Duration:** 4-6 weeks  
**Target Release:** Q1 2026

---

## 🔍 Problem Statement

Currently, couriers must:
1. Click "Navigate to Pickup" → Opens Google Maps (external app)
2. Complete navigation in Google Maps
3. Return to our app
4. Mark as arrived
5. Repeat for dropoff

**Issues:**
- Context switching disrupts workflow
- No tracking of actual route taken
- Can't automatically detect arrivals
- Inconsistent user experience
- Loss of engagement (courier leaves app)

---

## ✨ Proposed Solution

**In-app navigation** with:
- Full-screen map view
- Turn-by-turn instructions
- Real-time position tracking
- Automatic step progression
- One-tap start navigation
- Seamless return to job detail

**Benefits:**
- 50% reduction in task completion time
- Better location accuracy for proof of delivery
- Increased app engagement
- Professional courier experience
- Auto-detect pickup/dropoff arrivals

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Job Detail Page                         │
│  [Start Navigation] ──────────────────────┐                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Navigation Context Provider                     │
│  • Manages navigation state globally                        │
│  • Coordinates between hooks and components                 │
│  • Persists state across navigation                         │
└─────────────────────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
        ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
        │  Navigation View    │ │  Location Tracking   │ │   Rerouting Logic   │
        │  (Full Screen)      │ │  (High Frequency)    │ │   (Off-route Det.)  │
        └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                    │                       │                       │
                    └───────────────────────┴───────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Mapbox Directions API                       │
│  • Fetches turn-by-turn route                               │
│  • Provides step instructions                               │
│  • Returns geometry for visualization                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Phases

### Phase 1: Navigation UI Foundation (Week 1-2)
**Goal:** Build reusable navigation components

**Deliverables:**
1. NavigationContext for global state
2. NavigationHeader component (current instruction)
3. NavigationMap component (auto-follow, zoomed)
4. StepList component (upcoming turns)

**Success Criteria:**
- Components render correctly with mock data
- State management works across app
- Map auto-follows location smoothly

---

### Phase 2: Navigation Flow Integration (Week 2-3)
**Goal:** Connect navigation to job workflow

**Deliverables:**
1. "Start Navigation" button on job detail page
2. Full-screen navigation view (`/navigation/active`)
3. Route initialization from job data
4. Exit navigation back to job detail

**Success Criteria:**
- Can start navigation from job
- Instructions display correctly
- Can exit navigation without crashes
- State persists during navigation

---

### Phase 3: Real-Time Tracking (Week 3-4)
**Goal:** Enable live position-based updates

**Deliverables:**
1. High-frequency location updates (1-2 seconds)
2. Distance-to-turn calculations
3. Automatic step progression
4. ETA updates based on speed

**Success Criteria:**
- Steps advance automatically
- ETA updates in real-time
- Distance accurate within 10 meters
- Smooth performance (no lag)

---

### Phase 4: Rerouting (Week 4-5)
**Goal:** Handle off-route scenarios

**Deliverables:**
1. Off-route detection (>50m threshold)
2. Automatic route recalculation
3. Smooth transition to new route
4. Reroute throttling (5-second minimum)

**Success Criteria:**
- Detects off-route within 10 seconds
- Reroutes successfully
- No excessive API calls
- User notified of rerouting

---

### Phase 5: Polish & Testing (Week 5-6)
**Goal:** Production-ready quality

**Deliverables:**
1. Voice instructions (optional)
2. Map rotation/bearing (optional)
3. Comprehensive testing
4. Beta testing with couriers
5. Performance optimization

**Success Criteria:**
- All P0 acceptance criteria met
- Battery drain < 5% per 30 min
- Zero crashes in testing
- Positive courier feedback

---

## 🧩 Component Breakdown

### NavigationContext
```typescript
interface NavigationContextType {
  // State
  isNavigating: boolean
  currentJob: Job | null
  currentStep: RouteStep | null
  remainingSteps: RouteStep[]
  distanceToNextTurn: number
  timeRemaining: number
  
  // Actions
  startNavigation: (job: Job) => Promise<void>
  stopNavigation: () => void
  updatePosition: (location: CourierLocation) => void
}
```

### NavigationHeader
- Current instruction (large text)
- Distance to turn (dynamic size)
- Next instruction preview
- ETA and total distance
- Exit button

### NavigationMap
- Full-screen Mapbox GL map
- Auto-follow with zoom 17-18
- Current position marker (pulsing blue)
- Route line (highlighted current segment)
- Pickup/dropoff markers
- Optional: bearing rotation

### StepList
- Collapsible panel (bottom sheet)
- Next 3-5 turns
- Maneuver icons
- Distance per step
- Swipe to dismiss

---

## 📊 Data Flow

```
1. User clicks "Start Navigation"
   ↓
2. NavigationContext.startNavigation(job)
   ↓
3. Fetch route from Mapbox Directions API
   ↓
4. Initialize state with route data
   ↓
5. Navigate to /navigation/active
   ↓
6. Start high-frequency location tracking
   ↓
7. On each location update:
   - Calculate distance to next step
   - Check if step completed (within threshold)
   - If completed, advance to next step
   - Check if off-route (>50m)
   - If off-route, trigger reroute
   ↓
8. On waypoint arrival:
   - Detect within 20m of pickup/dropoff
   - Show "Arrived at [Location]" prompt
   - Allow manual confirmation
   ↓
9. User exits navigation
   ↓
10. Stop location tracking
    ↓
11. Navigate back to job detail
```

---

## 🔧 Technical Decisions

### Location Tracking Frequency
- **Near turn (< 100m):** 1 second updates
- **Between turns:** 3 second updates
- **Idle (not moving):** 5 second updates

**Rationale:** Balances accuracy with battery life

### Off-Route Threshold
- **Distance:** 50 meters perpendicular from route
- **Duration:** Sustained for 10 seconds
- **Reroute cooldown:** 5 seconds minimum

**Rationale:** Prevents false positives (GPS drift, tunnels)

### Map Camera Settings
- **Zoom:** 17 (street-level detail)
- **Pitch:** 0° (top-down) initially, 45° optional
- **Bearing:** Optional rotation based on heading
- **Padding:** 20% from top for instruction card

**Rationale:** Provides context without obstruction

### State Persistence
- Use React Context (not Redux)
- Store minimal state (current step, route)
- Reset on navigation exit

**Rationale:** Simple, performant, sufficient for single-session state

---

## 🚀 Deployment Strategy

### Stage 1: Feature Flag (Week 5)
```typescript
// In featureFlags collection
{
  enableInAppNavigation: false // Default off
}
```

Enable for internal testing only.

### Stage 2: Beta Testing (Week 6)
- Enable for 5 selected couriers
- Monitor crash reports
- Collect feedback survey
- Iterate on UX issues

### Stage 3: Phased Rollout (Week 7)
- 25% of active couriers
- Monitor performance metrics
- A/B test vs. Google Maps
- Measure completion times

### Stage 4: Full Rollout (Week 8)
- Enable for all couriers
- Remove Google Maps links
- Monitor support tickets
- Celebrate 🎉

---

## ⚠️ Risk Assessment

### High Risk
**Background Location on iOS**
- **Impact:** Can't track when app backgrounded
- **Mitigation:** 
  - Implement screen wake-lock
  - Consider native wrapper (Capacitor)
  - Warn users to keep app open

### Medium Risk
**Battery Drain**
- **Impact:** Couriers complain about battery life
- **Mitigation:**
  - Adaptive tracking frequency
  - Optimize map render cycles
  - Provide battery usage stats

**API Rate Limits**
- **Impact:** Reroutes fail at scale
- **Mitigation:**
  - Cache routes aggressively
  - Debounce reroute requests
  - Monitor usage in Firebase

### Low Risk
**Voice Guidance Quality**
- **Impact:** TTS sounds robotic
- **Mitigation:**
  - Make voice optional
  - Use high-quality TTS service
  - Allow volume control

---

## 📈 Success Metrics

### Phase 1-2 (Foundation)
- [ ] All navigation components render without errors
- [ ] Navigation context state updates correctly
- [ ] Can navigate between views seamlessly

### Phase 3-4 (Core Functionality)
- [ ] 95% accuracy in step progression
- [ ] Rerouting works within 10 seconds
- [ ] Zero crashes in 100 test sessions

### Phase 5 (Production)
- [ ] 80% courier adoption rate (vs Google Maps)
- [ ] Average navigation session: 10+ minutes
- [ ] App retention increases by 15%
- [ ] Support tickets < 5 per week

---

## 📚 Reference Implementation

### Similar Apps to Study
1. **Uber Driver App** - Clean navigation UI
2. **DoorDash** - Automatic arrival detection
3. **Instacart Shopper** - Multi-stop navigation
4. **Waze** - Community features (optional)

### Mapbox Examples
- [Navigation SDK Demo](https://docs.mapbox.com/ios/navigation/examples/)
- [Turn-by-Turn Directions](https://docs.mapbox.com/help/tutorials/navigation-intro/)

---

## 🔨 Development Environment Setup

### Prerequisites
```bash
# Mapbox token already configured
VITE_MAPBOX_TOKEN=pk.xxx

# Enable navigation feature flag locally
# In browser DevTools console:
localStorage.setItem('ENABLE_IN_APP_NAVIGATION', 'true')
```

### Testing Route
**Recommended test route (short, multiple turns):**
- Start: 1600 Pennsylvania Ave NW, Washington, DC
- Pickup: Lincoln Memorial, Washington, DC  
- Dropoff: Washington Monument, Washington, DC

**Why?** Well-known landmarks, ~2 miles total, 5-7 turns.

---

## 📞 Support & Communication

### Weekly Check-ins
- Monday: Sprint planning
- Wednesday: Demo progress
- Friday: Retrospective

### Communication Channels
- GitHub: Code reviews, issues
- Slack: Daily standups, questions
- Figma: UI/UX designs
- Loom: Demo recordings

### Stakeholders
- **Product Owner:** [Name]
- **Tech Lead:** [Name]
- **Courier Ambassador:** [Name] (beta tester)

---

## ✅ Checklist for Next Developer

Before starting:
- [ ] Read this document end-to-end
- [ ] Review GitHub issue (`.github/ISSUE_TEMPLATE/in-app-navigation-enhancement.md`)
- [ ] Study existing Mapbox integration (`MapboxMap.tsx`)
- [ ] Test current location tracking in dev mode
- [ ] Set up local feature flag
- [ ] Run courier app and create a test job

First task:
- [ ] Create `NavigationContext.tsx` skeleton
- [ ] Add basic state management
- [ ] Test context provider wraps app correctly

Quick wins:
- [ ] Directions API already works - use existing hook
- [ ] Map component is solid - can reuse most of it
- [ ] Location tracking exists - just needs "nav mode"

---

**Last Updated:** January 24, 2026  
**Document Owner:** Development Team  
**Version:** 1.0
