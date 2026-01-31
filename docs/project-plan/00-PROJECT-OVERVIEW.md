# GoSenderr v2 - Project Overview

**Last Updated:** January 2026  
**Version:** 2.0  
**Status:** Planning Phase

---

## 🎯 Vision

Build a modern, scalable on-demand delivery platform with three distinct applications serving different user needs:
- **Admin Desktop App** - Platform management and operations
- **Marketplace App** - Unified buyer/seller web and iOS experience
- **Courier iOS App** - Map-first native delivery experience

---

## 📱 What We're Building

### 1. Admin Desktop App (Electron)
**Platform:** macOS and Windows Desktop  
**Purpose:** Comprehensive platform management and operations

A standalone desktop application that gives administrators full control over the GoSenderr platform with native OS integration and offline capabilities.

**Key Features:**
- User management (customers, sellers, couriers)
- Order monitoring and management
- Analytics and revenue tracking
- Dispute resolution
- Feature flags and platform configuration
- Native desktop experience with keyboard shortcuts

**Distribution:**
- `GoSenderr Admin.app` (macOS .dmg installer)
- `GoSenderr Admin.exe` (Windows installer)

---

### 2. Marketplace App (Web + iOS)
**Platform:** Web (Firebase Hosting) + iOS (Capacitor)  
**Purpose:** Unified marketplace for buying and selling items

A single application where users can both buy AND sell items. Users have one account with role-based permissions - no separate buyer/seller accounts.

**Key Features:**
- Browse marketplace (public)
- Search and filters
- Purchase items (any user)
- List items for sale (any user becomes seller)
- Order management (buyer and seller views)
- Messaging between buyers and sellers
- Ratings and reviews
- Native iOS app features (push notifications, camera)

**Unified User Model:**
```
Single User Account
├── Can browse (always)
├── Can buy items (always)
└── Can sell items (always)
    └── Seller profile activated on first listing
```

**Distribution:**
- Web: `gosenderr-marketplace.web.app`
- iOS: App Store (Capacitor wrapper)

---

### 3. Courier iOS App (React Native)
**Platform:** iOS Native (React Native)  
**Purpose:** Map-first delivery experience for couriers

A native iOS app built with React Native featuring a full-screen map interface with all interactions happening on or over the map - no separate pages or bottom sheets.

**Core Principle: Map-First Design**
```
┌─────────────────────────┐
│  🟢 Online   [Profile]  │  ← Floating buttons
│                         │
│                         │
│    📍 (job pins)        │  ← Full-screen map
│                         │
│                         │
│  ┌─────────────────┐   │
│  │ Job Card Overlay │   │  ← Floating card
│  │ [Accept] [Skip]  │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

**Key Features:**
- Real-time location tracking
- Job acceptance (atomic transactions)
- Turn-by-turn navigation (Mapbox)
- Photo capture for delivery proof
- Earnings tracking
- All UI elements float over map

**Distribution:**
- iOS: App Store (native React Native)

---

## 📊 Current Status

### What's Working
✅ **Existing Apps:**
- Marketplace app (Vite + React) - deployed
- Courier app (Vite + React) - deployed
- Admin app (Vite + React) - deployed
- Admin Desktop (Electron) - in progress
- Landing page - deployed

✅ **Backend Infrastructure:**
- Firebase Authentication (Phone + Email)
- Cloud Firestore database
- Cloud Storage for photos
- Firebase Hosting (multi-site)
- Basic Cloud Functions

✅ **Core Features:**
- Job creation and tracking
- Real-time location updates
- Package photo uploads
- Basic courier matching
- Pricing calculations

### What We're Changing

**Phase 1: Admin Desktop**
- Convert `apps/admin-app` to Electron desktop app
- Keep all existing features
- Add native desktop capabilities
- Build for macOS and Windows

**Phase 2: Marketplace**
- Build on `apps/marketplace-app` for unified buyer/seller flows
- Implement unified user model (buyer + seller)
- Add selling/listing capabilities
- Wrap with Capacitor for iOS
- Add marketplace-specific features

**Phase 3: Courier Native**
- Rebuild courier app as React Native
- Implement map-first UI design
- Native iOS features (camera, location)
- Optimized performance for map rendering

---

## 📅 Timeline Overview

### Phase 1: Admin Desktop App
**Duration:** 3-5 days  
**Status:** Not Started

1. Set up Electron project structure
2. Migrate admin-app React code
3. Configure native menus and shortcuts
4. Build and test macOS version
5. Build and test Windows version
6. Create distributable packages

**Deliverables:**
- macOS installer (.dmg + .app)
- Windows installer (.exe)
- Updated deployment documentation

---

### Phase 2: Marketplace App
**Duration:** 5-7 days  
**Status:** Not Started

1. Design unified user model schema
2. Update Firestore collections
3. Build seller listing features
4. Build buyer purchase flow
5. Add messaging system
6. Implement ratings/reviews
7. Set up Capacitor for iOS
8. Deploy web version
9. Submit iOS version to App Store

**Deliverables:**
- Web app on Firebase Hosting
- iOS app on App Store
- Complete Firestore schema
- Cloud Functions for marketplace logic

---

### Phase 3: Courier iOS Native
**Duration:** 7-10 days  
**Status:** Not Started

1. Set up React Native project
2. Integrate Mapbox GL Native SDK
3. Build map shell architecture
4. Implement floating UI components
5. Add job acceptance flow
6. Integrate turn-by-turn navigation
7. Add camera for delivery photos
8. Build earnings tracking
9. Test and optimize performance
10. Submit to App Store

**Deliverables:**
- Native iOS app (React Native)
- App Store submission
- Performance optimization documentation
- Courier training materials

---

## 📈 Success Metrics

### Technical Metrics
- **Build Success Rate:** 100% (all platforms build without errors)
- **App Size:** 
  - Admin Desktop: < 150MB (macOS), < 200MB (Windows)
  - Marketplace iOS: < 50MB
  - Courier iOS: < 60MB
- **Performance:**
  - Map rendering: 60fps on iPhone 12+
  - App launch time: < 2 seconds
  - API response time: < 500ms (p95)

### User Experience Metrics
- **Admin Desktop:**
  - Daily active admins: Track platform usage
  - Average session duration: > 30 minutes
  - Feature adoption rate: > 80% of features used

- **Marketplace:**
  - Seller conversion rate: 15% of buyers also list items
  - Average items per seller: 3+
  - Buyer retention: 60% make 2nd purchase within 30 days

- **Courier iOS:**
  - Job acceptance rate: > 70%
  - Average jobs per session: 4+
  - Navigation accuracy: < 50m error radius

### Business Metrics
- **Platform Growth:**
  - 25% increase in total orders (marketplace + delivery)
  - 40% increase in courier sign-ups (native app)
  - 20% increase in platform revenue

- **Operational Efficiency:**
  - Admin response time: < 5 minutes for disputes
  - Courier onboarding time: < 10 minutes
  - Seller onboarding time: < 5 minutes

---

## 🎨 Design Philosophy

### Admin Desktop
**Principle:** *Power and Efficiency*
- Keyboard shortcuts for all actions
- Multi-window support
- Offline capabilities
- Native OS integration
- Information density optimized for desktop

### Marketplace
**Principle:** *Simplicity and Trust*
- One account, multiple roles
- Clear distinction between buying and selling
- Trust indicators (ratings, verified profiles)
- Mobile-first responsive design
- Seamless web-to-native experience

### Courier iOS
**Principle:** *Map-First, Distraction-Free*
- Full-screen map always visible
- No page transitions or bottom sheets
- Floating, minimal UI elements
- One-tap actions
- Optimized for one-handed operation while driving

---

## 🔄 Migration Strategy

### Existing Apps
Current Vite + React apps remain functional during development:
- Continue serving existing users
- No breaking changes until v2 launch
- Gradual feature parity validation

### Data Migration
All existing Firestore data is preserved:
- Users remain unchanged (add seller fields as needed)
- Jobs/orders maintain backward compatibility
- Add new collections for marketplace features
- Cloud Functions handle data transformation

### User Transition
- **Admins:** Receive desktop app download link
- **Customers → Marketplace Users:** Automatic account upgrade
- **Couriers:** Invited to download native iOS app
- All apps can coexist during transition period

---

## 🚧 Risks and Mitigation

### Technical Risks

**Risk:** Electron app bundle size too large  
**Mitigation:** Tree-shaking, code splitting, exclude dev dependencies

**Risk:** React Native performance issues on older iPhones  
**Mitigation:** Set minimum iOS version to 14.0, optimize map rendering

**Risk:** Capacitor iOS app rejected by App Store  
**Mitigation:** Follow Apple guidelines, test thoroughly before submission

### Business Risks

**Risk:** Users don't adopt native apps  
**Mitigation:** Maintain web apps, incentivize with native-only features

**Risk:** Sellers don't list items (low marketplace adoption)  
**Mitigation:** Zero listing fees for first 3 months, featured seller program

**Risk:** Development timeline slips  
**Mitigation:** Phased approach, MVP features first, weekly progress reviews

---

## 🎯 Phase Exit Criteria

### Phase 1 Complete When:
- [ ] Admin desktop app builds on macOS
- [ ] Admin desktop app builds on Windows
- [ ] All existing admin features work
- [ ] Installers created and tested
- [ ] At least 2 admins using desktop app daily

### Phase 2 Complete When:
- [ ] Users can list items for sale
- [ ] Users can purchase items
- [ ] Messaging works between buyers/sellers
- [ ] Ratings/reviews implemented
- [ ] Web app deployed to Firebase
- [ ] iOS app submitted to App Store

### Phase 3 Complete When:
- [ ] Map renders at 60fps on iPhone 12
- [ ] Couriers can accept jobs
- [ ] Turn-by-turn navigation works
- [ ] Photo capture implemented
- [ ] Earnings tracking accurate
- [ ] iOS app submitted to App Store

---

## 📚 Documentation Structure

This planning documentation is organized as follows:

- **00-PROJECT-OVERVIEW.md** ← You are here
- **01-SYSTEM-ARCHITECTURE.md** - Tech stack and system design
- **02-USER-ROLES-AND-FLOWS.md** - User journeys and flows
- **03-PHASE-1-ADMIN-DESKTOP.md** - Detailed admin desktop plan
- **04-PHASE-2-MARKETPLACE.md** - Detailed marketplace plan
- **05-PHASE-3-COURIER-IOS.md** - Detailed courier iOS plan
- **06-DATABASE-SCHEMA.md** - Complete Firestore schema
- **07-CLOUD-FUNCTIONS.md** - Firebase Cloud Functions API
- **08-DEPLOYMENT-GUIDE.md** - Build and deploy instructions
- **09-DAILY-CHECKLIST.md** - Day-by-day task breakdown
- **10-FOLDER-STRUCTURE.md** - Final repository structure
- **11-TECH-STACK-REFERENCE.md** - Technologies quick reference

---

## 🚀 Getting Started

**For Developers:**
1. Read this overview
2. Review system architecture (01-SYSTEM-ARCHITECTURE.md)
3. Understand user flows (02-USER-ROLES-AND-FLOWS.md)
4. Start with Phase 1 plan (03-PHASE-1-ADMIN-DESKTOP.md)
5. Follow daily checklist (09-DAILY-CHECKLIST.md)

**For Product Managers:**
1. Review user roles and flows (02-USER-ROLES-AND-FLOWS.md)
2. Validate success metrics (this document)
3. Track progress using phase plans
4. Monitor exit criteria

**For Stakeholders:**
1. Review vision and goals (this document)
2. Understand timeline (this document)
3. Track success metrics
4. Review weekly progress reports

---

## ✅ Next Steps

1. ✅ Complete project planning documentation
2. ⏳ Review and approve plans with team
3. ⏳ Set up development environment for Phase 1
4. ⏳ Begin Phase 1: Admin Desktop (Day 1)

---

*This document serves as the single source of truth for the GoSenderr v2 project. Update as the project evolves.*
