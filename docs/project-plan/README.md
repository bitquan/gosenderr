# GoSenderr v2 - Project Planning Documentation

> **Status:** ✅ **Ready for implementation** — _Reviewed Jan 30, 2026_

**Complete reorganization plan for building GoSenderr v2**

This directory contains comprehensive planning documentation for the GoSenderr v2 project reorganization. These documents serve as the **single source of truth** for development - no code changes required, only documentation.

---

## 📚 Documentation Index

### Getting Started
Start here to understand the project vision and plan:

**[00-PROJECT-OVERVIEW.md](00-PROJECT-OVERVIEW.md)**
- Project vision and goals
- What we're building (3 apps)
- Current status
- Timeline overview (20 days across 3 phases)
- Success metrics

---

### Architecture & Design

**[01-SYSTEM-ARCHITECTURE.md](01-SYSTEM-ARCHITECTURE.md)**
- Complete tech stack breakdown
- System diagrams (text-based)
- Data flow between apps
- Authentication flow
- File storage strategy
- External service integrations

**[02-USER-ROLES-AND-FLOWS.md](02-USER-ROLES-AND-FLOWS.md)**
- Unified user model (single account, multiple roles)
- User journey maps:
  - Buyer: Browse → Purchase → Track
  - Seller: List → Manage → Ship
  - Courier: Accept → Navigate → Complete
  - Admin: Monitor → Manage → Resolve
- Status transitions for orders/jobs
- Role-based permissions matrix

---

### Implementation Phases

**[03-PHASE-1-ADMIN-DESKTOP.md](03-PHASE-1-ADMIN-DESKTOP.md)**
- **Duration:** 3-5 days
- Convert admin-app to Electron desktop app
- Electron setup and configuration
- Native menus and shortcuts
- Build for macOS and Windows
- Day-by-day implementation steps

**[04-PHASE-2-MARKETPLACE.md](04-PHASE-2-MARKETPLACE.md)**
- **Duration:** 5-7 days
- Unified buyer/seller user model
- Marketplace features (browse, buy, sell, messaging, ratings)
- Web app deployment (Firebase Hosting)
- iOS app with Capacitor
- Database schema updates

**[05-PHASE-3-COURIER-IOS.md](05-PHASE-3-COURIER-IOS.md)**
- **Duration:** 7-10 days
- Map-first design (full-screen map, floating UI)
- React Native implementation
- Mapbox GL Native integration
- Real-time location tracking
- Turn-by-turn navigation
- Camera for delivery proof photos

---

### Technical Reference

**[06-DATABASE-SCHEMA.md](06-DATABASE-SCHEMA.md)**
- Complete Firestore schema for all 9 collections:
  - users, marketplaceItems, orders, jobs
  - conversations/messages, ratings, disputes, payouts
- TypeScript interfaces for every document type
- Composite indexes configuration
- Security rules examples
- Data retention strategy

**[07-CLOUD-FUNCTIONS.md](07-CLOUD-FUNCTIONS.md)**
- 25+ documented Cloud Functions with code examples
- Core marketplace functions (createOrder, cancelOrder)
- Job management functions (claimJob, updateJobStatus, completeDelivery)
- Payment functions (createPayout, handleStripeWebhook)
- Notification functions (push, email, SMS)
- Firestore triggers and scheduled functions
- Testing and deployment

---

### Operations & Deployment

**[08-DEPLOYMENT-GUIDE.md](08-DEPLOYMENT-GUIDE.md)**
- Build commands for all apps
- Deployment instructions:
  - Admin Desktop: macOS (.dmg) + Windows (.exe)
  - Marketplace Web: Firebase Hosting
  - Marketplace iOS: App Store via Xcode
  - Courier iOS: App Store via Xcode
  - Cloud Functions: Firebase deployment
- CI/CD integration (GitHub Actions)
- Environment configuration
- Troubleshooting guide

**[09-DAILY-CHECKLIST.md](09-DAILY-CHECKLIST.md)**
- Day-by-day task breakdown (20 days total)
- **Week 1 (Days 1-5):** Admin Desktop App
- **Week 2 (Days 6-12):** Marketplace App
- **Week 3 (Days 13-20):** Courier iOS App
- Each day: 4-8 specific tasks with time estimates
- Clear deliverables and verification checks
- Ready-to-execute commands

**[10-FOLDER-STRUCTURE.md](10-FOLDER-STRUCTURE.md)**
- Final repository structure
- Visual folder tree
- Migration guide from current to v2
- File naming conventions
- Import patterns and path aliases
- Quick reference for finding code
- Common commands cheatsheet

**[11-TECH-STACK-REFERENCE.md](11-TECH-STACK-REFERENCE.md)**
- Quick reference for all technologies
- Frontend: React 18, TypeScript 5.7, Tailwind CSS 3.4
- Mobile: React Native 0.72, Capacitor 5.5
- Desktop: Electron 28
- Backend: Firebase (Firestore, Auth, Functions, Storage)
- Maps: Mapbox GL JS (web), Mapbox Native (iOS)
- Payments: Stripe with Stripe Connect
- Version numbers, installation commands, best practices

**[12-COURIER-V2-NATIVE-BLUEPRINT.md](12-COURIER-V2-NATIVE-BLUEPRINT.md)**
- Full native courier v2 plan (Plan D)
- Dual-track rollout with feature flags
- Step-by-step phases and exit criteria

---

## 🎯 How to Use This Documentation

### For Developers
1. **Start:** Read [00-PROJECT-OVERVIEW.md](00-PROJECT-OVERVIEW.md)
2. **Understand:** Review [01-SYSTEM-ARCHITECTURE.md](01-SYSTEM-ARCHITECTURE.md) and [02-USER-ROLES-AND-FLOWS.md](02-USER-ROLES-AND-FLOWS.md)
3. **Execute:** Follow [09-DAILY-CHECKLIST.md](09-DAILY-CHECKLIST.md) day by day
4. **Reference:** Use phase plans (03, 04, 05) for detailed implementation
5. **Deploy:** Follow [08-DEPLOYMENT-GUIDE.md](08-DEPLOYMENT-GUIDE.md)

### For Product Managers
1. Review [00-PROJECT-OVERVIEW.md](00-PROJECT-OVERVIEW.md) for vision and timeline
2. Validate user flows in [02-USER-ROLES-AND-FLOWS.md](02-USER-ROLES-AND-FLOWS.md)
3. Monitor progress using phase plans and daily checklist
4. Track success metrics defined in overview

### For Stakeholders
1. Read executive summary in [00-PROJECT-OVERVIEW.md](00-PROJECT-OVERVIEW.md)
2. Review timeline and deliverables
3. Track progress weekly against phase exit criteria
4. Monitor success metrics post-launch

---

## 📊 Documentation Stats

- **Total Documents:** 12 files
- **Total Size:** ~350 KB
- **Total Lines:** ~9,000 lines
- **Code Examples:** 100+ complete examples
- **TypeScript Interfaces:** 40+ documented
- **Functions Documented:** 25+ Cloud Functions
- **Total Tasks:** 160+ actionable tasks
- **Time Estimate:** 20 days (160 hours)

---

## 🚀 Quick Start

Ready to begin development? Follow these steps:

### Step 1: Review Documentation (2-3 hours)
```bash
# Read in order:
1. 00-PROJECT-OVERVIEW.md
2. 01-SYSTEM-ARCHITECTURE.md
3. 02-USER-ROLES-AND-FLOWS.md
4. 09-DAILY-CHECKLIST.md (skim for overview)
```

### Step 2: Set Up Development Environment
```bash
# Install dependencies
pnpm install

# Build shared packages
cd packages/shared && pnpm build

# Set up environment variables
cp apps/admin-app/.env.example apps/admin-app/.env.local
# (edit .env.local with your Firebase/Mapbox/Stripe keys)
```

### Step 3: Start Phase 1 (Admin Desktop)
```bash
# Follow Day 1 checklist in 09-DAILY-CHECKLIST.md
# Detailed instructions in 03-PHASE-1-ADMIN-DESKTOP.md

mkdir -p apps/admin-desktop
cd apps/admin-desktop
# ... continue with Day 1 tasks
```

---

## 📅 Timeline Summary

| Phase | Duration | Deliverables | Status |
|-------|----------|--------------|--------|
| **Phase 1: Admin Desktop** | 3-5 days | macOS + Windows desktop apps | Planning |
| **Phase 2: Marketplace** | 5-7 days | Web app + iOS marketplace app | Planning |
| **Phase 3: Courier iOS** | 7-10 days | Native iOS courier app | Planning |
| **Total** | **15-22 days** | **3 production apps** | **Ready to start** |

---

## ✅ Phase Exit Criteria

### Phase 1 Complete When:
- [ ] Admin desktop app builds on macOS
- [ ] Admin desktop app builds on Windows
- [ ] All existing admin features work
- [ ] Installers created and tested
- [ ] At least 2 admins using desktop app

### Phase 2 Complete When:
- [ ] Users can list items for sale
- [ ] Users can purchase items
- [ ] Messaging works between buyers/sellers
- [ ] Ratings/reviews implemented
- [ ] Web app deployed to Firebase
- [ ] iOS app submitted to App Store

### Phase 3 Complete When:
- [ ] Map renders at 60fps on iPhone 12
- [ ] Couriers can accept jobs on map
- [ ] Turn-by-turn navigation works
- [ ] Photo capture implemented
- [ ] Earnings tracking accurate
- [ ] iOS app submitted to App Store

---

## 🔧 Tools & Resources

### Required Tools
- Node.js 20+
- pnpm 8+
- Xcode 15+ (for iOS builds)
- Android Studio (optional)
- Firebase CLI
- Electron (auto-installed)

### External Services
- Firebase project (Auth, Firestore, Storage, Functions, Hosting)
- Mapbox account (access token)
- Stripe account (API keys + Connect)
- Apple Developer account ($99/year for App Store)

### Documentation Links
- [Electron Docs](https://www.electronjs.org/docs)
- [React Native Docs](https://reactnative.dev)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Mapbox Docs](https://docs.mapbox.com/)
- [Stripe Docs](https://stripe.com/docs)

---

## 📞 Support

### Questions?
1. Check relevant documentation file in this directory
2. Review [ARCHITECTURE.md](../../ARCHITECTURE.md) for current system
3. Check [docs/](../) for additional technical docs
4. Search GitHub Issues

### Found an Issue?
1. Documentation errors: Create PR to fix
2. Technical questions: Open GitHub Discussion
3. Bugs: Open GitHub Issue with template

---

## 📝 Document Maintenance

**Update Frequency:** These planning documents are static (planning phase). Once development begins, actual implementation may differ. Keep updated as needed.

**Last Major Update:** January 2026  
**Next Review:** Before each phase begins

---

## 🎉 Ready to Build!

This documentation provides everything needed to build GoSenderr v2 from start to finish. Follow the daily checklist, reference the technical docs, and ship amazing products!

**Let's build! 🚀**

---

*For questions or clarifications, reach out to the development team or open a GitHub Discussion.*
