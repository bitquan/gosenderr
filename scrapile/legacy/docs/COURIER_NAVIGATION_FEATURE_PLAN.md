# Courier Turn-by-Turn Navigation Feature Plan

**Branch:** `feature/courier-turn-by-turn-navigation`  
**Created:** January 24, 2026  
**Status:** Planning Phase

---

## 📋 Feature Overview

Add comprehensive turn-by-turn navigation system for courier drivers with visual route preview, job details on map, and automatic route focusing when jobs are selected.

---

## 🎯 Core Requirements

### 1. Route Visualization
- **Polyline Route Display**
  - Show route from driver's current location → pickup → dropoff
  - Use Mapbox GL JS Directions API or similar
  - Display route as colored polyline on map
  - Different colors for: current-to-pickup (blue) vs pickup-to-dropoff (green)

### 2. Job Card/Thumbnail on Map
- **Visual Overlay on Map**
  - Floating job cards/thumbnails overlaid on map
  - Display for each available job:
    - Package photo/icon
    - Price/earnings
    - Package size (small/medium/large)
    - Pickup address
    - Distance to pickup
  - Clickable to preview route

### 3. Route Preview (Before Accept)
- **Show on Thumbnail Click**
  - Driver clicks job thumbnail on map OR clicks job in bottom sheet list
  - Map auto-focuses/zooms to show full route
  - Polyline appears showing: driver location → pickup → dropoff
  - Job details remain visible (sticky card or modal)
  - Clear "Accept Job" CTA on preview

### 4. Turn-by-Turn Navigation (After Accept)
- **Active Navigation Mode**
  - After accepting job, full turn-by-turn starts
  - Voice directions (optional: use Web Speech API or native)
  - Real-time route updates as driver moves
  - ETA calculations
  - Rerouting if driver goes off course
  - Step-by-step instruction panel (e.g., "Turn right on Main St in 500 ft")

### 5. Auto-Focus Behavior
- **Map Interaction**
  - Clicking job in "Available Sends" bottom sheet → auto-focus on that job's route
  - Clicking job thumbnail on map → same behavior
  - Smooth animated transitions (flyTo animation)
  - Fit bounds to show entire route with padding

---

## 🏗️ Technical Architecture

### Component Structure
```
apps/courier-app/src/
├── components/
│   ├── navigation/
│   │   ├── RoutePolyline.tsx          # Renders route polyline on map
│   │   ├── JobThumbnailOverlay.tsx    # Floating job cards on map
│   │   ├── TurnByTurnPanel.tsx        # Active navigation instructions
│   │   ├── RoutePreview.tsx           # Preview modal/card before accept
│   │   └── NavigationControls.tsx     # Zoom, center, recenter buttons
│   └── v2/
│       └── MapboxMap.tsx              # ENHANCE: Add route support
├── hooks/
│   ├── useMapboxDirections.ts         # Fetch routes from Mapbox Directions API
│   ├── useRouteNavigation.ts          # Manage navigation state
│   └── useMapFocus.ts                 # Control map camera/focus
├── pages/
│   └── dashboard/page.tsx             # UPDATE: Add route preview/nav
└── lib/
    └── navigation/
        ├── directions.ts              # Directions API integration
        ├── polyline.ts                # Polyline encoding/decoding
        └── routing.ts                 # Route calculation helpers
```

### Data Flow
```
1. Driver sees available jobs in bottom sheet + map thumbnails
2. Click job → useMapFocus triggers map.flyTo()
3. useMapboxDirections fetches route: driver → pickup → dropoff
4. RoutePolyline component renders polyline on map
5. RoutePreview shows job details + route overview
6. "Accept Job" → TurnByTurnPanel activates
7. Real-time location updates → check against route steps
8. Voice/visual turn instructions displayed
```

---

## 🔧 Implementation Phases

### Phase 1: Route Preview (1-2 days)
**Goal:** Show route polyline when job is selected

**Tasks:**
- [ ] Create `useMapboxDirections` hook
  - Integrate Mapbox Directions API
  - Fetch multi-waypoint route (driver → pickup → dropoff)
  - Return polyline coordinates + turn-by-turn steps
- [ ] Create `RoutePolyline` component
  - Accept route coordinates
  - Render as Mapbox GL layer/source
  - Support different colors per segment
- [ ] Update `MapboxMap` component
  - Add route layer support
  - Add route state management
- [ ] Create `useMapFocus` hook
  - Implement flyTo animation
  - Calculate bounds for route
  - Smooth camera transitions
- [ ] Update `DashboardPage`
  - Add selected job state
  - Connect job click → route preview
  - Show RoutePolyline when job selected

**Acceptance Criteria:**
- ✅ Clicking job shows route on map
- ✅ Map auto-zooms to fit entire route
- ✅ Route polyline displays correctly
- ✅ Can deselect job to hide route

---

### Phase 2: Job Thumbnails on Map (1 day)
**Goal:** Visual job cards overlaid on map at pickup locations

**Tasks:**
- [ ] Create `JobThumbnailOverlay` component
  - Position at pickup lat/lng using map projection
  - Display compact job info (price, size, photo)
  - Clickable to trigger route preview
  - Responsive to map zoom/pan
- [ ] Add thumbnail positioning logic
  - Convert lat/lng to screen x/y
  - Update position on map move
  - Handle clustering if jobs overlap
- [ ] Style thumbnails
  - Badge-style design
  - Clear visual hierarchy
  - Active state when selected

**Acceptance Criteria:**
- ✅ Thumbnails appear at pickup locations
- ✅ Clicking thumbnail selects job + shows route
- ✅ Thumbnails move correctly with map pan/zoom
- ✅ Visual distinction for selected job

---

### Phase 3: Enhanced Route Preview UI (1 day)
**Goal:** Better preview experience before accepting job

**Tasks:**
- [ ] Create `RoutePreview` modal/card component
  - Show job details (pickup/dropoff addresses, fee, distance)
  - Display route summary (total distance, ETA)
  - Prominent "Accept Job" button
  - "Close Preview" option
- [ ] Add route segment breakdown
  - Distance from driver to pickup
  - Distance from pickup to dropoff
  - Total trip distance and estimated time
- [ ] Improve map interaction during preview
  - Dim available jobs list
  - Highlight selected job
  - Lock map focus on route

**Acceptance Criteria:**
- ✅ Route preview shows complete job info
- ✅ Route metrics displayed (distance, time)
- ✅ Accept button prominent and functional
- ✅ Can close preview and return to job list

---

### Phase 4: Turn-by-Turn Navigation (2-3 days)
**Goal:** Active navigation after accepting job

**Tasks:**
- [ ] Create `TurnByTurnPanel` component
  - Display current instruction (e.g., "Turn right in 500 ft")
  - Show next instruction preview
  - Display ETA and distance remaining
  - Step progress indicator
- [ ] Create `useRouteNavigation` hook
  - Track driver position against route steps
  - Detect when instruction should update
  - Calculate distance to next turn
  - Trigger rerouting if off-course
- [ ] Implement voice directions (optional v1)
  - Use Web Speech API for text-to-speech
  - Trigger at appropriate times (e.g., 500ft before turn)
  - Toggle voice on/off in settings
- [ ] Add navigation controls
  - Recenter map on driver location
  - Cancel navigation
  - Report issue/block
- [ ] Handle navigation states
  - En route to pickup
  - Arrived at pickup (prompt to confirm)
  - En route to dropoff
  - Arrived at dropoff (prompt to complete)

**Acceptance Criteria:**
- ✅ Turn-by-turn instructions appear after accepting job
- ✅ Instructions update as driver moves along route
- ✅ Map stays centered on driver location (optional: ahead of driver)
- ✅ Voice directions work (if implemented)
- ✅ Can cancel navigation
- ✅ Navigation prompts at pickup/dropoff arrival

---

### Phase 5: Polish & Optimization (1 day)
**Goal:** Smooth UX and performance

**Tasks:**
- [ ] Optimize route fetching
  - Cache routes for selected jobs
  - Debounce route recalculation
  - Handle API errors gracefully
- [ ] Improve animations
  - Smooth polyline drawing
  - Fluid map transitions
  - Loading states for route fetching
- [ ] Add edge case handling
  - No GPS signal
  - API rate limits
  - Network errors
  - Invalid routes
- [ ] Testing
  - Test with real GPS movement (on device)
  - Test with multiple jobs visible
  - Test route switching
  - Test navigation cancellation

**Acceptance Criteria:**
- ✅ Performance is smooth (no lag)
- ✅ Error states handled gracefully
- ✅ Works on real device with GPS
- ✅ All edge cases covered

---

## 🎨 UI/UX Design Notes

### Job Thumbnail Design
```
┌─────────────────────┐
│ 📦 $12.50          │
│ Small Package       │
│ 0.5 mi away        │
└─────────────────────┘
```
- Compact badge-style
- Emoji or icon for package type
- Price prominently displayed
- Distance to pickup
- Tap to preview route

### Route Preview Modal
```
┌─────────────────────────────────┐
│ Job Preview                  ✕  │
├─────────────────────────────────┤
│ 📍 Pickup                       │
│    123 Main St                  │
│    0.5 mi away (3 min)         │
│                                 │
│ 🎯 Dropoff                      │
│    456 Oak Ave                  │
│    2.3 mi from pickup (8 min)  │
│                                 │
│ 💰 Earnings: $12.50            │
│ 📦 Size: Small                 │
│ 🚗 Total Trip: 2.8 mi (11 min) │
│                                 │
│  [  Accept Job - $12.50  ]     │
└─────────────────────────────────┘
```

### Turn-by-Turn Panel
```
┌─────────────────────────────────┐
│ ⬆️ Turn right on Main St        │
│    in 500 ft                    │
│                                 │
│ Next: Continue on Main St       │
│ ETA: 8 min | 2.1 mi remaining  │
└─────────────────────────────────┘
```
- Fixed position at top or bottom
- Large arrow/icon for current action
- Distance to next turn
- Preview of next instruction
- ETA and distance remaining

---

## 🔌 API Integration

### Mapbox Directions API
**Endpoint:** `https://api.mapbox.com/directions/v5/mapbox/driving/{coordinates}`

**Request Example:**
```
GET /directions/v5/mapbox/driving/-122.42,37.78;-122.45,37.80;-122.43,37.82
?access_token=YOUR_TOKEN
&geometries=geojson
&steps=true
&banner_instructions=true
&voice_instructions=true
```

**Response:**
```json
{
  "routes": [{
    "geometry": { "type": "LineString", "coordinates": [...] },
    "legs": [
      {
        "distance": 1234.5,
        "duration": 180.2,
        "steps": [
          {
            "distance": 234.5,
            "duration": 30.1,
            "geometry": {...},
            "maneuver": {
              "instruction": "Turn right onto Main Street",
              "type": "turn",
              "modifier": "right"
            }
          }
        ]
      }
    ]
  }]
}
```

**Cost:** $0.50 per 1,000 requests (Directions API)

---

## 📊 State Management

### Navigation Context/Store
```typescript
interface NavigationState {
  selectedJob: Job | null
  routeData: RouteData | null
  isNavigating: boolean
  currentStep: number
  distanceToNextTurn: number
  eta: number
  voiceEnabled: boolean
}

interface RouteData {
  geometry: GeoJSON.LineString
  legs: RouteLeg[]
  distance: number
  duration: number
}

interface RouteLeg {
  steps: RouteStep[]
  distance: number
  duration: number
}

interface RouteStep {
  instruction: string
  distance: number
  duration: number
  maneuver: {
    type: string
    modifier?: string
    location: [number, number]
  }
}
```

---

## ⚠️ Considerations & Risks

### Technical Risks
1. **API Costs**: Mapbox Directions API has usage limits
   - Solution: Cache routes, optimize requests
2. **GPS Accuracy**: Indoor/urban areas may have poor GPS
   - Solution: Show accuracy indicator, handle gracefully
3. **Battery Drain**: Continuous GPS tracking + map rendering
   - Solution: Optimize refresh rate, allow background mode
4. **Network Reliability**: May lose connection during trip
   - Solution: Cache route data, handle offline gracefully

### UX Risks
1. **Cognitive Load**: Too much info on map
   - Solution: Progressive disclosure, clear visual hierarchy
2. **Distraction**: Turn-by-turn while driving
   - Solution: Voice instructions, minimal UI, safety warnings
3. **Map Performance**: Many jobs + routes = slow rendering
   - Solution: Limit visible jobs, lazy load routes

---

## 🚀 Launch Checklist

**Pre-Launch:**
- [ ] Test on iOS device with real GPS
- [ ] Test on Android device with real GPS
- [ ] Test with poor GPS signal
- [ ] Test with no network connection
- [ ] Test with multiple jobs visible
- [ ] Test route switching mid-navigation
- [ ] Test voice instructions (if implemented)
- [ ] Performance testing (map FPS, route loading time)
- [ ] Review Mapbox API usage/costs
- [ ] Add analytics events (route previewed, navigation started, etc.)

**Launch Criteria:**
- ✅ All acceptance criteria met for Phases 1-4
- ✅ No critical bugs
- ✅ Performance acceptable on mid-range devices
- ✅ Works on both iOS and Android
- ✅ Approved by product/design team

---

## 📝 Future Enhancements (V2+)

- **Multi-Stop Routes**: Handle multiple pickups/dropoffs in one trip
- **Route Optimization**: Suggest best order for multiple jobs
- **Traffic Integration**: Show real-time traffic, suggest alternates
- **Offline Maps**: Cache map tiles for offline use
- **AR Navigation**: Augmented reality turn-by-turn (using device camera)
- **Safety Features**: Speed limit warnings, hazard alerts
- **Driver Preferences**: Avoid highways, toll roads, etc.
- **Historical Data**: Show past routes, frequent locations

---

## 📚 Resources

- [Mapbox Directions API Docs](https://docs.mapbox.com/api/navigation/directions/)
- [Mapbox GL JS Navigation Control](https://docs.mapbox.com/mapbox-gl-js/example/navigation/)
- [React Mapbox GL Examples](https://visgl.github.io/react-map-gl/examples)
- [Web Speech API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## 🤝 Team & Timeline

**Developer:** PapaDev  
**Estimated Duration:** 6-8 days  
**Start Date:** January 24, 2026  
**Target Completion:** January 31, 2026

**Milestones:**
- Jan 25: Phase 1 complete (Route Preview)
- Jan 26: Phase 2 complete (Job Thumbnails)
- Jan 27: Phase 3 complete (Enhanced Preview)
- Jan 29: Phase 4 complete (Turn-by-Turn)
- Jan 30: Phase 5 complete (Polish)
- Jan 31: Testing & Launch

---

**Next Steps:**
1. Review and approve this plan
2. Set up Mapbox Directions API access
3. Start Phase 1 implementation
4. Create tracking issues for each phase
