# Daily Development Checklist

**Last Updated:** January 2026  
**Version:** 2.0  
**Total Duration:** 20 Days (3 Phases)

---

## 📅 Overview

This document provides a day-by-day breakdown of tasks for building GoSenderr v2. Each day includes specific, actionable tasks with time estimates and expected deliverables.

**Timeline:**
- **Week 1 (Days 1-5):** Admin Desktop App - 5 days
- **Week 2 (Days 6-12):** Marketplace Web + iOS - 7 days
- **Week 3 (Days 13-20):** Courier iOS App - 8 days

**Daily Work Hours:** 8 hours  
**Total Project Hours:** 160 hours

---

## Week 1: Admin Desktop App

### Day 1 - Electron Setup & Migration

**Goal:** Set up Electron infrastructure and migrate existing admin app

**Tasks:**

1. **Create Admin Desktop App Directory** ⏱️ 30 min
   ```bash
   mkdir -p apps/admin-desktop
   cd apps/admin-desktop
   pnpm init
   ```
   - Set up package.json with Electron dependencies
   - Configure as workspace member in pnpm-workspace.yaml
   - Add to turbo.json build pipeline

2. **Install Electron & Build Tools** ⏱️ 30 min
   ```bash
   pnpm add -D electron@^28.0.0 electron-builder@^24.9.1
   pnpm add -D vite@^7.3.1 typescript@^5.7.2
   pnpm add -D concurrently wait-on
   ```
   - Install all required dev dependencies
   - Set up electron-builder configuration file

3. **Copy Existing Admin App Code** ⏱️ 1 hour
   ```bash
   cp -r apps/admin-app/src apps/admin-desktop/src
   cp -r apps/admin-app/public apps/admin-desktop/public
   cp apps/admin-app/index.html apps/admin-desktop/
   ```
   - Copy all source files
   - Copy Vite config and tsconfig
   - Update import paths if needed

4. **Create Electron Main Process** ⏱️ 2 hours
   - Create `electron/main.ts` with window management
   - Set up IPC communication bridge
   - Configure window size, title bar, and behavior
   - Add development/production URL handling
   - Implement app lifecycle events

5. **Create Preload Script** ⏱️ 1 hour
   - Create `electron/preload.ts`
   - Expose safe IPC methods to renderer
   - Set up context bridge for security
   - Add type definitions for exposed APIs

6. **Configure Native Menu** ⏱️ 1.5 hours
   - Create `electron/menu.ts`
   - Add File, Edit, View, Window, Help menus
   - Implement keyboard shortcuts (Cmd+Q, Cmd+W, etc.)
   - Add menu items for common actions

7. **Test Development Build** ⏱️ 1 hour
   ```bash
   pnpm dev
   ```
   - Start Vite dev server and Electron together
   - Verify hot reload works
   - Test all existing admin features
   - Fix any import/path issues

8. **Setup App Icons** ⏱️ 30 min
   - Create icons directory: `apps/admin-desktop/build/`
   - Add icon.icns (macOS - 1024x1024)
   - Add icon.ico (Windows - 256x256)
   - Add icon.png (Linux - 512x512)

**Deliverables:**
- ✅ Electron app runs in development
- ✅ All admin features work (user mgmt, orders, analytics)
- ✅ Native window controls functional
- ✅ Menu bar with keyboard shortcuts

**End of Day Check:**
```bash
cd apps/admin-desktop
pnpm dev
# App opens with full functionality
```

---

### Day 2 - Desktop Features & System Integration

**Goal:** Add native desktop capabilities and system integration

**Tasks:**

1. **Implement System Tray** ⏱️ 1.5 hours
   - Add tray icon and menu
   - Minimize to tray on close
   - Restore from tray click
   - Add quick actions (Open Dashboard, New Order, Quit)

2. **Add Keyboard Shortcuts** ⏱️ 1 hour
   - Global shortcuts registration
   - Dashboard: Cmd+1
   - Users: Cmd+2
   - Orders: Cmd+3
   - Analytics: Cmd+4
   - Search: Cmd+K

3. **Implement File Operations** ⏱️ 2 hours
   - Export orders to CSV
   - Export analytics reports to PDF
   - Import user data from CSV
   - Save/load app state
   - Add file dialogs using Electron's dialog API

4. **Add Offline Detection** ⏱️ 1 hour
   - Detect network status changes
   - Show offline banner
   - Queue operations for when online
   - Handle Firebase connection errors gracefully

5. **Native Notifications** ⏱️ 1.5 hours
   - System notifications for new orders
   - Notifications for disputed orders
   - Notification preferences in settings
   - Click notification to open relevant page

6. **Window State Persistence** ⏱️ 1 hour
   - Save window size and position
   - Restore last window state on launch
   - Remember last viewed page
   - Store in electron-store or localStorage

7. **Setup Auto-Updater (Optional)** ⏱️ 1.5 hours
   - Configure electron-updater
   - Add update check on launch
   - Show update available dialog
   - Download and install on quit

8. **Testing & Bug Fixes** ⏱️ 30 min
   - Test all new desktop features
   - Verify system tray works
   - Test keyboard shortcuts
   - Fix any issues

**Deliverables:**
- ✅ System tray integration working
- ✅ Keyboard shortcuts functional
- ✅ File import/export working
- ✅ Offline mode handles gracefully
- ✅ Native notifications working

**End of Day Check:**
```bash
# Test system tray
# Test keyboard shortcuts (Cmd+1, Cmd+2, etc.)
# Test file exports
# Turn off wifi and verify offline banner appears
```

---

### Day 3 - Production Build Configuration

**Goal:** Set up production builds for macOS and Windows

**Tasks:**

1. **Configure electron-builder** ⏱️ 2 hours
   - Create `electron-builder.yml`
   - Configure macOS build (DMG, app, universal binary)
   - Configure Windows build (NSIS installer)
   - Set app ID, product name, copyright
   - Configure file associations and URL schemes

2. **Setup Build Scripts** ⏱️ 1 hour
   - Add build:mac script
   - Add build:win script
   - Add build:linux script (optional)
   - Configure pre-build hooks
   - Setup post-build cleanup

3. **Create App Signing Setup (macOS)** ⏱️ 2 hours
   - Create entitlements.mac.plist
   - Configure hardened runtime
   - Setup notarization config
   - Document signing certificate requirements
   - Create environment variable template

4. **Create App Signing Setup (Windows)** ⏱️ 1 hour
   - Configure Authenticode signing
   - Setup certificate requirements
   - Create signing script
   - Document code signing process

5. **Test macOS Build** ⏱️ 1.5 hours
   ```bash
   pnpm build:mac --universal
   ```
   - Build universal binary (Apple Silicon + Intel)
   - Test on macOS (M1/M2 and Intel)
   - Verify DMG installer works
   - Check app signature and entitlements

6. **Test Windows Build** ⏱️ 1.5 hours
   ```bash
   pnpm build:win
   ```
   - Build Windows installer
   - Test on Windows 10/11
   - Verify NSIS installer works
   - Check start menu shortcuts

7. **Optimize Build Size** ⏱️ 30 min
   - Remove unnecessary files from build
   - Configure asar packaging
   - Minimize bundle size
   - Check final app size (target: <200MB)

8. **Document Build Process** ⏱️ 30 min
   - Create BUILD.md in admin-desktop
   - Document build requirements
   - Document signing process
   - Add troubleshooting section

**Deliverables:**
- ✅ macOS .dmg installer builds successfully
- ✅ Windows .exe installer builds successfully
- ✅ Build scripts working
- ✅ App signing configured (dev certs OK)
- ✅ Build documentation complete

**End of Day Check:**
```bash
cd apps/admin-desktop
pnpm build:mac
# GoSenderr-Admin-2.0.0-universal.dmg created
pnpm build:win
# GoSenderr-Admin-Setup-2.0.0.exe created
```

---

### Day 4 - Testing & Polish

**Goal:** Comprehensive testing and UI polish for desktop app

**Tasks:**

1. **UI/UX Review** ⏱️ 2 hours
   - Review all pages for desktop layout
   - Ensure proper window resizing behavior
   - Fix any truncated text or overlapping elements
   - Optimize for common desktop resolutions (1920x1080, 2560x1440)
   - Test on both light and dark modes

2. **Performance Optimization** ⏱️ 1.5 hours
   - Analyze app startup time
   - Optimize initial render
   - Lazy load heavy components
   - Reduce bundle size where possible
   - Profile memory usage

3. **Error Handling** ⏱️ 1.5 hours
   - Add error boundaries
   - Graceful failure for network errors
   - User-friendly error messages
   - Log errors for debugging
   - Add retry mechanisms

4. **Accessibility** ⏱️ 1 hour
   - Keyboard navigation works everywhere
   - Focus indicators visible
   - Screen reader compatibility
   - High contrast mode support

5. **Security Hardening** ⏱️ 1.5 hours
   - Enable context isolation
   - Disable nodeIntegration in renderer
   - Validate IPC messages
   - Sanitize user inputs
   - Review Content Security Policy

6. **Testing Checklist** ⏱️ 2 hours
   - Test all user management features
   - Test order management (create, update, cancel, refund)
   - Test analytics dashboard
   - Test dispute resolution
   - Test feature flags
   - Test settings and configuration
   - Test file imports/exports
   - Test offline mode
   - Test notifications

7. **Bug Fixes** ⏱️ 1.5 hours
   - Fix issues found during testing
   - Address performance bottlenecks
   - Resolve UI/UX issues

**Deliverables:**
- ✅ All features tested and working
- ✅ Performance optimized
- ✅ Security hardened
- ✅ Accessibility improvements
- ✅ Bug fixes completed

**End of Day Check:**
- Run through complete user flow
- Verify no console errors
- Check app responsiveness
- Confirm all features work

---

### Day 5 - CI/CD & Release Prep

**Goal:** Set up automated builds and prepare for release

**Tasks:**

1. **GitHub Actions Workflow** ⏱️ 2 hours
   - Create `.github/workflows/build-desktop.yml`
   - Configure macOS runner for macOS builds
   - Configure Windows runner for Windows builds
   - Add build matrix for multiple platforms
   - Configure artifact uploads

2. **Setup GitHub Secrets** ⏱️ 1 hour
   - Add APPLE_ID secret
   - Add APPLE_APP_SPECIFIC_PASSWORD
   - Add MAC_CERT_BASE64 (signing certificate)
   - Add MAC_CERT_PASSWORD
   - Add WIN_CERT_BASE64
   - Add WIN_CERT_PASSWORD
   - Document secret setup process

3. **Test CI/CD Pipeline** ⏱️ 1.5 hours
   - Push code to trigger workflow
   - Monitor build progress
   - Download and test artifacts
   - Fix any CI-specific issues
   - Verify builds work on both platforms

4. **Create Release Process** ⏱️ 1 hour
   - Document release checklist
   - Create GitHub release template
   - Setup version numbering scheme (semantic versioning)
   - Add release notes template
   - Configure draft releases

5. **Distribution Planning** ⏱️ 1.5 hours
   - Setup GitHub Releases
   - Create download page mockup
   - Plan update notification system
   - Document manual installation process
   - Plan for future App Store distribution (macOS)

6. **Final Testing** ⏱️ 1.5 hours
   - Download CI-built artifacts
   - Test macOS .dmg on fresh machine
   - Test Windows .exe on fresh machine
   - Verify auto-updates work (if configured)
   - Test on different OS versions

7. **Documentation** ⏱️ 30 min
   - Update README.md
   - Add installation instructions
   - Add user guide
   - Document known issues
   - Add FAQ section

8. **Phase 1 Wrap-up** ⏱️ 30 min
   - Review all deliverables
   - Create Phase 1 summary
   - Demo to team
   - Plan Phase 2 kickoff

**Deliverables:**
- ✅ CI/CD pipeline working
- ✅ Automated builds for macOS and Windows
- ✅ GitHub Releases configured
- ✅ Documentation complete
- ✅ Admin Desktop App ready for internal use

**End of Day Check:**
```bash
# Verify GitHub Actions workflow passes
# Download artifacts from latest workflow run
# Install and test both macOS and Windows builds
# Confirm ready for internal beta testing
```

**Phase 1 Complete! 🎉**

---

## Week 2: Marketplace Web + iOS

### Day 6 - Marketplace Setup & Core Structure

**Goal:** Create marketplace app foundation and navigation

**Tasks:**

1. **Create Marketplace App** ⏱️ 1 hour
   ```bash
   cd apps
   pnpm create vite marketplace-app --template react-ts
   cd marketplace-app
   pnpm install
   ```
   - Initialize with Vite + React + TypeScript
   - Add to pnpm-workspace.yaml
   - Configure turbo.json
   - Setup ESLint and Prettier

2. **Install Core Dependencies** ⏱️ 30 min
   ```bash
   pnpm add react-router-dom @tanstack/react-query
   pnpm add firebase @stripe/stripe-js
   pnpm add tailwindcss @headlessui/react @heroicons/react
   pnpm add zustand date-fns
   ```
   - Install routing, state management, UI libraries
   - Configure Tailwind CSS
   - Setup theme and design tokens

3. **Firebase Configuration** ⏱️ 1 hour
   - Create Firebase config file
   - Initialize Firebase app
   - Setup Authentication
   - Configure Firestore
   - Setup Storage for images

4. **Create Folder Structure** ⏱️ 1 hour
   ```
   src/
   ├── components/     # Reusable UI components
   ├── pages/          # Page components
   ├── features/       # Feature modules
   ├── hooks/          # Custom React hooks
   ├── lib/            # Utilities and helpers
   ├── stores/         # Zustand stores
   ├── types/          # TypeScript types
   └── routes/         # Route definitions
   ```
   - Create all directories
   - Add index files
   - Setup path aliases in tsconfig

5. **Setup React Router** ⏱️ 1.5 hours
   - Create router configuration
   - Define public routes (/, /listings, /listing/:id)
   - Define protected routes (/account, /orders, /sell)
   - Create layout components
   - Add loading states

6. **Create Layout Components** ⏱️ 2 hours
   - Header with navigation
   - Footer
   - Sidebar (mobile menu)
   - Public layout (for non-authenticated pages)
   - Protected layout (for authenticated pages)
   - Responsive mobile-first design

7. **Authentication Context** ⏱️ 1.5 hours
   - Create AuthContext with Firebase Auth
   - Implement sign up with email/password
   - Implement login
   - Implement logout
   - Implement password reset
   - Add Google Sign-In (optional)

8. **Test Navigation & Auth** ⏱️ 30 min
   - Test all routes
   - Test authentication flow
   - Verify protected routes redirect
   - Check responsive design

**Deliverables:**
- ✅ Marketplace app initialized
- ✅ Navigation structure complete
- ✅ Authentication working
- ✅ Layouts responsive

**End of Day Check:**
```bash
cd apps/marketplace-app
pnpm dev
# App runs at http://localhost:5173
# Can sign up, log in, log out
# Navigation works on mobile and desktop
```

---

### Day 7 - Marketplace Listings & Browse

**Goal:** Build marketplace browsing and listing detail pages

**Tasks:**

1. **Design System Components** ⏱️ 2 hours
   - Button component with variants
   - Input component (text, email, password)
   - Card component
   - Badge component
   - Avatar component
   - Loading spinner
   - Empty state component

2. **Listing Card Component** ⏱️ 1.5 hours
   - Image with placeholder fallback
   - Title, price, location
   - Seller avatar and name
   - Listing status badge
   - Favorite button (heart icon)
   - Click to view detail

3. **Browse Marketplace Page** ⏱️ 2 hours
   - Grid layout of listing cards
   - Infinite scroll or pagination
   - Empty state when no listings
   - Loading state with skeletons
   - Responsive grid (1 col mobile, 2 col tablet, 3-4 col desktop)

4. **Search & Filter UI** ⏱️ 1.5 hours
   - Search input with debounce
   - Category filter dropdown
   - Price range filter (min-max)
   - Location filter (within X miles)
   - Sort options (newest, price low-high, price high-low)
   - Clear filters button

5. **Listing Detail Page** ⏱️ 2 hours
   - Image gallery with thumbnails
   - Title, price, description
   - Seller info card
   - Location on map (placeholder for now)
   - "Buy Now" button (protected)
   - "Contact Seller" button (protected)
   - Share button
   - Report listing button

6. **Firestore Queries** ⏱️ 1 hour
   - Query listings with filters
   - Pagination cursors
   - Real-time listener for listing updates
   - Optimize with composite indexes

**Deliverables:**
- ✅ Browse marketplace page complete
- ✅ Listing detail page complete
- ✅ Search and filters working
- ✅ Responsive design

**End of Day Check:**
```bash
# Browse marketplace
# Search for items
# Filter by category and price
# Click listing to view details
# All responsive on mobile
```

---

### Day 8 - Selling Items & Listing Management

**Goal:** Implement item listing creation and seller dashboard

**Tasks:**

1. **Create Listing Form** ⏱️ 2.5 hours
   - Multi-step form (3 steps)
   - Step 1: Photos (upload multiple images)
   - Step 2: Details (title, description, price, category)
   - Step 3: Location (pickup address or location pin)
   - Form validation with react-hook-form
   - Image preview and reordering
   - Save draft functionality

2. **Image Upload** ⏱️ 1.5 hours
   - Upload to Firebase Storage
   - Image compression before upload
   - Multiple image support (max 8 images)
   - Drag and drop upload
   - Progress indicator
   - Delete uploaded images

3. **Seller Dashboard** ⏱️ 2 hours
   - "My Listings" page
   - Active listings grid
   - Sold listings grid
   - Draft listings grid
   - Quick actions (Edit, Mark as Sold, Delete)
   - Listing stats (views, favorites)

4. **Edit Listing** ⏱️ 1 hour
   - Pre-populate form with existing data
   - Update listing in Firestore
   - Handle image updates (add/remove)
   - Save changes

5. **Seller Profile Creation** ⏱️ 1.5 hours
   - Create seller profile on first listing
   - Profile form (display name, bio, avatar)
   - Save to Firestore users/{userId}/seller_profile
   - Update user's seller status flag

6. **Testing** ⏱️ 30 min
   - Create a new listing end-to-end
   - Edit an existing listing
   - Mark listing as sold
   - Delete a listing
   - Verify images upload correctly

**Deliverables:**
- ✅ Create listing flow complete
- ✅ Seller dashboard functional
- ✅ Edit listing working
- ✅ Image uploads working

**End of Day Check:**
```bash
# Sign in
# Create a new listing with photos
# View in "My Listings"
# Edit the listing
# Mark as sold
```

---

### Day 9 - Checkout & Orders

**Goal:** Implement purchase flow and order management

**Tasks:**

1. **Stripe Setup** ⏱️ 1 hour
   - Install Stripe SDK
   - Create Stripe context
   - Load publishable key from env
   - Create payment intent hook

2. **Checkout Flow** ⏱️ 2.5 hours
   - Checkout page with listing summary
   - Stripe payment form (card input)
   - Delivery address form
   - Order total calculation (item price + delivery fee + platform fee)
   - Confirm order button
   - Loading and error states

3. **Cloud Function: createOrder** ⏱️ 2 hours
   - Validate listing availability
   - Create Stripe PaymentIntent
   - Create order in Firestore
   - Calculate fees (platform, delivery)
   - Update listing status to "sold"
   - Return payment client secret

4. **Order Confirmation Page** ⏱️ 1 hour
   - Order success page
   - Order details summary
   - Payment confirmation
   - Next steps (wait for courier assignment)
   - Track order button

5. **My Orders (Buyer View)** ⏱️ 1.5 hours
   - List all orders as buyer
   - Order cards with status
   - Filter by status (pending, in progress, delivered)
   - Click to view order detail

6. **My Sales (Seller View)** ⏱️ 1 hour
   - List all orders as seller
   - Similar UI to buyer view
   - Shows buyer info (name, delivery address)
   - Actions (contact buyer, view proof of delivery)

7. **Order Detail Page** ⏱️ 1 hour
   - Shared page for buyer and seller
   - Order timeline (created, courier assigned, picked up, delivered)
   - Listing details
   - Delivery address
   - Courier info (when assigned)
   - Live tracking button (placeholder)

**Deliverables:**
- ✅ Checkout flow complete
- ✅ Stripe payment working
- ✅ Order creation working
- ✅ Buyer and seller order views

**End of Day Check:**
```bash
# Buy an item with test card (4242 4242 4242 4242)
# View order in "My Orders"
# Check seller sees order in "My Sales"
# View order details
```

---

### Day 10 - Messaging & Notifications

**Goal:** Add in-app messaging and notification system

**Tasks:**

1. **Chat Data Model** ⏱️ 1 hour
   - Design Firestore schema for conversations
   - `conversations/{conversationId}/messages/{messageId}`
   - Participants, last message, unread count
   - Message: text, timestamp, sender, read status

2. **Conversations List** ⏱️ 1.5 hours
   - List all conversations for user
   - Show other participant avatar and name
   - Show last message preview
   - Unread badge
   - Sort by most recent message
   - Click to open conversation

3. **Chat Interface** ⏱️ 2.5 hours
   - Message list with auto-scroll to bottom
   - Sender vs recipient message bubbles
   - Text input with send button
   - Real-time message updates
   - Message timestamps
   - Read receipts
   - "Other person is typing..." indicator

4. **Start Conversation** ⏱️ 1 hour
   - "Contact Seller" button on listing detail
   - Create or open existing conversation
   - Navigate to chat interface
   - Pre-populate with listing context

5. **Notifications System** ⏱️ 2 hours
   - Cloud Function: sendNotification
   - Email notifications for new messages (SendGrid)
   - Push notification setup (web push)
   - Notification preferences in user settings
   - Mark as read functionality

6. **In-App Notification UI** ⏱️ 1 hour
   - Bell icon in header with unread count
   - Dropdown with recent notifications
   - Click to navigate to relevant page
   - Mark all as read

**Deliverables:**
- ✅ Messaging system working
- ✅ Real-time chat functional
- ✅ Notifications working
- ✅ Email notifications sent

**End of Day Check:**
```bash
# Click "Contact Seller" on a listing
# Send messages back and forth
# Receive real-time updates
# Check email for notifications
```

---

### Day 11 - Ratings & Reviews

**Goal:** Implement rating and review system

**Tasks:**

1. **Rating Data Model** ⏱️ 30 min
   - Design Firestore schema
   - `ratings/{ratingId}`: orderId, from, to, role (buyer/seller/courier), rating (1-5), review text

2. **Rate Order Flow** ⏱️ 2 hours
   - Show "Rate Order" prompt after delivery
   - Rating modal/page
   - 5-star rating selector
   - Optional review text area
   - Submit rating button
   - Thank you confirmation

3. **Display Ratings on Profile** ⏱️ 1.5 hours
   - Seller profile shows average rating
   - Number of ratings
   - Recent reviews list
   - Star display component

4. **Display Ratings on Listings** ⏱️ 1 hour
   - Show seller rating on listing detail
   - Click to view seller profile
   - Trust indicator (verified seller, # of sales)

5. **My Ratings Page** ⏱️ 1.5 hours
   - Ratings received (as seller/courier)
   - Ratings given (as buyer)
   - Average rating calculation
   - Filter and sort options

6. **Rating Aggregation** ⏱️ 1.5 hours
   - Cloud Function: onRatingCreated
   - Update user's rating stats
   - Calculate average rating
   - Store aggregated data for performance

7. **Testing & Polish** ⏱️ 1 hour
   - Test complete rating flow
   - Verify rating displays correctly
   - Test edge cases (no ratings, all 5-star, etc.)
   - UI polish and animations

**Deliverables:**
- ✅ Rating system complete
- ✅ Reviews display on profiles
- ✅ Average ratings calculated
- ✅ User can rate after orders

**End of Day Check:**
```bash
# Complete an order
# Rate the seller
# View rating on seller's profile
# Check average rating updates
```

---

### Day 12 - Capacitor iOS Setup

**Goal:** Wrap marketplace web app for iOS with Capacitor

**Tasks:**

1. **Install Capacitor** ⏱️ 30 min
   ```bash
   cd apps/marketplace-app
   pnpm add @capacitor/core @capacitor/cli
   pnpm add @capacitor/ios
   pnpm exec cap init
   ```
   - Configure app name and ID
   - Set webDir to 'dist'

2. **Add iOS Platform** ⏱️ 30 min
   ```bash
   pnpm exec cap add ios
   cd ios
   pod install
   ```
   - Generate iOS project
   - Install CocoaPods dependencies

3. **Install Native Plugins** ⏱️ 1 hour
   ```bash
   pnpm add @capacitor/camera
   pnpm add @capacitor/push-notifications
   pnpm add @capacitor/geolocation
   pnpm add @capacitor/share
   pnpm add @capacitor/status-bar
   pnpm add @capacitor/haptics
   pnpm exec cap sync ios
   ```
   - Add all required plugins
   - Sync with iOS project

4. **Configure iOS Project** ⏱️ 1.5 hours
   - Open in Xcode: `pnpm exec cap open ios`
   - Set bundle ID: com.gosenderr.marketplace
   - Set team and signing
   - Configure Info.plist permissions
   - Add camera usage description
   - Add location usage description
   - Configure push notifications capability

5. **Native Camera Integration** ⏱️ 2 hours
   - Update image upload to use native camera
   - Detect platform (web vs iOS)
   - Use Camera plugin on iOS
   - Test on simulator and device
   - Handle permissions

6. **Push Notifications Setup** ⏱️ 2 hours
   - Configure Firebase Cloud Messaging for iOS
   - Add FCM to iOS project
   - Request notification permissions
   - Handle notification tap events
   - Test notifications

7. **iOS-Specific Polish** ⏱️ 1.5 hours
   - Status bar styling
   - Safe area insets
   - iOS keyboard handling
   - Haptic feedback on interactions
   - Splash screen
   - App icon

8. **Build and Test** ⏱️ 1 hour
   ```bash
   pnpm build
   pnpm exec cap sync ios
   pnpm exec cap open ios
   # Build in Xcode
   ```
   - Test on iOS simulator
   - Test on physical device
   - Verify all features work natively

**Deliverables:**
- ✅ iOS app builds successfully
- ✅ Camera works natively
- ✅ Push notifications configured
- ✅ All web features work on iOS

**End of Day Check:**
```bash
# Run on iOS simulator
# Test camera for listing photos
# Test all marketplace features
# Verify push notifications work
```

**Phase 2 Complete! 🎉**

---

## Week 3: Courier iOS App

### Day 13 - React Native Setup

**Goal:** Initialize Courier iOS app with React Native

**Tasks:**

1. **Create React Native App** ⏱️ 1 hour
   ```bash
   cd apps
   npx react-native@latest init CourierApp --template react-native-template-typescript
   mv CourierApp courier-app
   cd courier-app
   ```
   - Initialize with TypeScript template
   - Add to workspace if using pnpm

2. **Project Configuration** ⏱️ 1.5 hours
   - Configure bundle ID: com.gosenderr.courier
   - Update app name in iOS project
   - Configure Info.plist
   - Setup URL schemes
   - Configure build settings

3. **Install Core Dependencies** ⏱️ 1 hour
   ```bash
   pnpm add @react-navigation/native @react-navigation/stack
   pnpm add react-native-screens react-native-safe-area-context
   pnpm add @react-native-firebase/app @react-native-firebase/auth
   pnpm add @react-native-firebase/firestore
   pnpm add zustand date-fns
   cd ios && pod install && cd ..
   ```
   - Install navigation
   - Install Firebase SDK
   - Install state management

4. **Install Map Dependencies** ⏱️ 1 hour
   ```bash
   pnpm add @rnmapbox/maps
   cd ios && pod install && cd ..
   ```
   - Install Mapbox React Native
   - Configure Mapbox access token
   - Setup permissions in Info.plist

5. **Firebase Configuration** ⏱️ 1.5 hours
   - Download GoogleService-Info.plist from Firebase Console
   - Add to Xcode project
   - Initialize Firebase in App.tsx
   - Configure Authentication
   - Configure Firestore

6. **Create Folder Structure** ⏱️ 1 hour
   ```
   src/
   ├── components/     # Reusable components
   ├── screens/        # Screen components
   ├── navigation/     # Navigation config
   ├── hooks/          # Custom hooks
   ├── stores/         # Zustand stores
   ├── services/       # API services
   ├── types/          # TypeScript types
   ├── utils/          # Utilities
   └── theme/          # Theme and styles
   ```

7. **Basic Navigation Setup** ⏱️ 1.5 hours
   - Create navigation container
   - Auth stack (Login, Register)
   - Main stack (Map, Profile)
   - Navigation types
   - Deep linking config

8. **Test Build** ⏱️ 30 min
   ```bash
   pnpm ios
   ```
   - Run on iOS simulator
   - Verify app launches
   - Check no errors

**Deliverables:**
- ✅ React Native app initialized
- ✅ Dependencies installed
- ✅ Firebase configured
- ✅ App runs on iOS

**End of Day Check:**
```bash
cd apps/courier-app
pnpm ios
# App opens on simulator
```

---

### Day 14 - Authentication & Map Foundation

**Goal:** Implement courier authentication and map-first interface

**Tasks:**

1. **Login Screen** ⏱️ 2 hours
   - Design login UI
   - Email and password inputs
   - "Sign In" button
   - "Forgot Password" link
   - Error handling
   - Loading state

2. **Authentication Service** ⏱️ 1.5 hours
   - Create AuthService with Firebase Auth
   - Sign in with email/password
   - Sign out
   - Auth state listener
   - Store user in Zustand

3. **Map Screen (Full Screen)** ⏱️ 2.5 hours
   - Full screen Mapbox map
   - Center on user's location
   - Show user location marker (blue dot)
   - Map controls (zoom in/out, center on user)
   - Loading state while map loads

4. **Location Permissions** ⏱️ 1 hour
   - Request location permissions on app launch
   - Handle permission denied
   - Show explanation if needed
   - Open settings if permanently denied
   - Add to Info.plist descriptions

5. **Online/Offline Toggle** ⏱️ 1.5 hours
   - Floating button at top: "🔴 Offline" / "🟢 Online"
   - Toggle courier online status
   - Update status in Firestore
   - Persist status locally
   - Haptic feedback on toggle

6. **Profile Button** ⏱️ 1 hour
   - Floating button at top right (avatar or icon)
   - Navigate to profile screen
   - Show courier name and rating

7. **Test End-to-End** ⏱️ 30 min
   - Sign in as courier
   - View map with user location
   - Toggle online/offline
   - Open profile

**Deliverables:**
- ✅ Authentication working
- ✅ Full screen map displays
- ✅ User location shown
- ✅ Online/offline toggle works

**End of Day Check:**
```bash
# Sign in as courier
# Map loads with location
# Toggle online status
# Check status updates in Firestore
```

---

### Day 15 - Job Offers & Acceptance

**Goal:** Display available jobs and allow courier to accept

**Tasks:**

1. **Jobs Firestore Listener** ⏱️ 1.5 hours
   - Real-time listener for available jobs
   - Filter by: status=pending, location within courier's radius
   - Store jobs in Zustand store
   - Update when jobs change

2. **Job Markers on Map** ⏱️ 2 hours
   - Display job pickup locations as markers
   - Custom marker icon (pin with package icon)
   - Different colors for job types
   - Cluster markers if many in same area
   - Tap marker to see job details

3. **Job Detail Overlay** ⏱️ 2.5 hours
   - Bottom sheet that slides up when marker tapped
   - Job details: pickup address, delivery address, distance, payout
   - "Accept Job" button
   - "Decline" or swipe down to close
   - Calculate estimated time

4. **Accept Job Flow** ⏱️ 2 hours
   - Cloud Function: acceptJob
   - Validate job still available
   - Assign job to courier
   - Update job status to "accepted"
   - Update courier's active job
   - Show success animation

5. **Active Job State** ⏱️ 1 hour
   - Store active job in Zustand
   - Persist to AsyncStorage
   - Load active job on app launch
   - Clear when job completed

6. **Navigation to Pickup** ⏱️ 1 hour
   - Show route from courier to pickup location
   - Estimated time of arrival
   - "Start Navigation" button (opens Maps app)
   - Mapbox Directions API integration

**Deliverables:**
- ✅ Jobs displayed on map
- ✅ Job details overlay works
- ✅ Accept job functional
- ✅ Navigation to pickup shown

**End of Day Check:**
```bash
# Sign in as courier
# Toggle online
# See available jobs on map
# Tap marker to see details
# Accept a job
# View route to pickup
```

---

### Day 16 - Active Job & Status Updates

**Goal:** Manage active job lifecycle and status updates

**Tasks:**

1. **Active Job UI** ⏱️ 2 hours
   - Persistent overlay showing active job
   - Current status (heading to pickup, at pickup, heading to delivery, delivered)
   - Pickup and delivery addresses
   - Customer phone (call button)
   - Current action button (context-aware)

2. **Status Flow UI** ⏱️ 2 hours
   - "Arrived at Pickup" button (when near pickup)
   - "Picked Up" button (after arriving at pickup)
   - "Arrived at Delivery" button (when near delivery)
   - "Delivered" button (after arriving at delivery)
   - Geofence detection for arrival

3. **Update Job Status** ⏱️ 1.5 hours
   - Cloud Function: updateJobStatus
   - Update job in Firestore
   - Send notifications to customer
   - Update courier's status
   - Validate status transitions

4. **Real-time Location Tracking** ⏱️ 2 hours
   - Background location tracking during active job
   - Update courier location in Firestore (every 10 seconds)
   - Show courier location to customer (real-time)
   - Battery optimization
   - Handle app backgrounding

5. **Proof of Delivery** ⏱️ 1.5 hours
   - Camera to take delivery photo
   - Upload photo to Firebase Storage
   - Optional customer signature (future)
   - Attach to job document

6. **Complete Job** ⏱️ 1 hour
   - Mark job as completed
   - Clear active job
   - Show earnings screen
   - Return to map to see new jobs

**Deliverables:**
- ✅ Active job UI complete
- ✅ Status updates working
- ✅ Real-time tracking functional
- ✅ Proof of delivery working
- ✅ Job completion flow works

**End of Day Check:**
```bash
# Accept a job
# Update status through full lifecycle
# Take proof of delivery photo
# Complete job
# See earnings
```

---

### Day 17 - Earnings & History

**Goal:** Build earnings dashboard and job history

**Tasks:**

1. **Earnings Screen** ⏱️ 2.5 hours
   - Today's earnings (total, per job)
   - This week's earnings
   - This month's earnings
   - Earnings chart (last 7 days)
   - Pending payout amount
   - Next payout date

2. **Job History List** ⏱️ 2 hours
   - List of completed jobs
   - Job cards with: date, pickup/delivery, earnings
   - Filter by date range
   - Search by customer name or address
   - Pagination or infinite scroll

3. **Job History Detail** ⏱️ 1 hour
   - Full job details
   - Timeline of status changes
   - Proof of delivery photo
   - Customer rating (if given)
   - Earnings breakdown

4. **Earnings Analytics** ⏱️ 1.5 hours
   - Total jobs completed
   - Average earnings per job
   - Total distance driven
   - Average rating
   - Busiest hours/days

5. **Stripe Connect Integration** ⏱️ 2 hours
   - Link to Stripe Connect account setup
   - Display connected account status
   - Show available balance
   - Payout schedule
   - Transaction history

6. **Testing** ⏱️ 1 hour
   - Complete multiple jobs
   - Verify earnings calculated correctly
   - Check job history displays
   - Test filters and search

**Deliverables:**
- ✅ Earnings dashboard complete
- ✅ Job history working
- ✅ Stripe Connect integrated
- ✅ Analytics displaying correctly

**End of Day Check:**
```bash
# View earnings dashboard
# Browse job history
# View job details
# Check Stripe Connect status
```

---

### Day 18 - Profile & Settings

**Goal:** Complete courier profile and app settings

**Tasks:**

1. **Profile Screen** ⏱️ 2 hours
   - Courier info: name, photo, rating
   - Total deliveries, member since
   - Average rating with star display
   - Badges/achievements
   - Edit profile button

2. **Edit Profile** ⏱️ 1.5 hours
   - Update name
   - Upload profile photo (camera or library)
   - Update phone number
   - Save changes to Firestore
   - Update Firebase Auth profile

3. **Settings Screen** ⏱️ 2 hours
   - Account settings
   - Notification preferences (new jobs, messages, updates)
   - Location tracking toggle
   - App version and build number
   - Terms of Service link
   - Privacy Policy link
   - Log out button

4. **Notification Preferences** ⏱️ 1.5 hours
   - Save preferences to Firestore
   - Configure FCM topics
   - Test notifications with preferences

5. **Support & Help** ⏱️ 1 hour
   - Help center (FAQ)
   - Contact support button (email or chat)
   - Report a problem
   - Safety resources

6. **Vehicle Information** ⏱️ 1.5 hours
   - Add/edit vehicle details
   - Vehicle type (car, bike, etc.)
   - License plate
   - Insurance expiration (admin verification)

7. **Testing** ⏱️ 30 min
   - Update profile
   - Change settings
   - Test notification preferences
   - Verify all links work

**Deliverables:**
- ✅ Profile screen complete
- ✅ Settings functional
- ✅ Notification preferences working
- ✅ Support resources available

**End of Day Check:**
```bash
# View profile
# Edit profile information
# Update settings
# Test notifications
```

---

### Day 19 - Polish & Testing

**Goal:** UI polish, performance optimization, and comprehensive testing

**Tasks:**

1. **UI/UX Polish** ⏱️ 2 hours
   - Review all screens for consistency
   - Improve animations and transitions
   - Add loading states everywhere
   - Improve empty states
   - Polish button states (disabled, loading)
   - Consistent spacing and typography

2. **Map Optimizations** ⏱️ 1.5 hours
   - Optimize marker rendering
   - Smooth map animations
   - Improve route display
   - Cache map tiles
   - Reduce API calls

3. **Performance Optimization** ⏱️ 1.5 hours
   - Optimize re-renders with React.memo
   - Memoize expensive calculations
   - Optimize Firestore queries
   - Reduce bundle size
   - Profile app with React Native Debugger

4. **Error Handling** ⏱️ 1.5 hours
   - Add error boundaries
   - Handle network errors gracefully
   - User-friendly error messages
   - Retry mechanisms for failed operations
   - Log errors to Firebase Crashlytics

5. **Offline Handling** ⏱️ 1 hour
   - Detect offline state
   - Show offline banner
   - Queue operations for when online
   - Handle Firestore offline persistence

6. **Comprehensive Testing** ⏱️ 2.5 hours
   - Test authentication (sign in, sign out)
   - Test map and location permissions
   - Test online/offline toggle
   - Test accepting jobs
   - Test status updates through full job lifecycle
   - Test proof of delivery
   - Test job completion
   - Test earnings and history
   - Test profile and settings
   - Test notifications
   - Test edge cases (no jobs, network issues)

**Deliverables:**
- ✅ UI polished and consistent
- ✅ Performance optimized
- ✅ Error handling robust
- ✅ All features tested

**End of Day Check:**
```bash
# Run through complete courier flow
# Test on slow network
# Test offline scenarios
# Verify no crashes or errors
```

---

### Day 20 - Release Preparation

**Goal:** Prepare courier iOS app for TestFlight and App Store

**Tasks:**

1. **App Store Assets** ⏱️ 2 hours
   - Create app icon (1024x1024)
   - Design launch screen
   - Take screenshots (all required sizes)
   - Write app description
   - Create preview video (optional)

2. **Build Configuration** ⏱️ 1 hour
   - Set version number (2.0.0)
   - Set build number (1)
   - Configure release scheme
   - Update bundle identifier
   - Configure App Transport Security

3. **Privacy & Permissions** ⏱️ 1 hour
   - Review all Info.plist usage descriptions
   - Location usage description
   - Camera usage description
   - Update privacy policy
   - Add privacy manifest

4. **Production Build** ⏱️ 1.5 hours
   - Archive in Xcode (Release configuration)
   - Validate archive
   - Upload to App Store Connect
   - Wait for processing

5. **TestFlight Setup** ⏱️ 1 hour
   - Create TestFlight beta group
   - Add internal testers
   - Add external testers
   - Write testing instructions
   - Distribute build

6. **App Store Submission** ⏱️ 1.5 hours
   - Fill out App Store Connect form
   - Select build
   - Add screenshots
   - Write app description and keywords
   - Set pricing (free)
   - Submit for review

7. **Documentation** ⏱️ 1 hour
   - Update README.md
   - Add courier onboarding guide
   - Document common issues
   - Create troubleshooting guide

8. **Project Wrap-up** ⏱️ 1 hour
   - Review all deliverables
   - Create project summary
   - Demo all 3 apps to team
   - Celebrate! 🎉

**Deliverables:**
- ✅ Courier iOS app submitted to App Store
- ✅ TestFlight build available
- ✅ Documentation complete
- ✅ All 3 apps ready for production

**End of Day Check:**
```bash
# Verify TestFlight link works
# Confirm app submitted to App Store
# All documentation updated
# All GitHub repos up to date
```

**Phase 3 Complete! 🎉**

---

## 🎊 Project Complete!

### Final Deliverables

✅ **Admin Desktop App**
- macOS and Windows installers
- CI/CD pipeline for automated builds
- Complete platform management features

✅ **Marketplace Web + iOS**
- Live on Firebase Hosting
- iOS app on TestFlight and App Store
- Complete marketplace with buying/selling

✅ **Courier iOS App**
- iOS app on TestFlight and App Store
- Map-first delivery experience
- Complete job lifecycle management

✅ **Cloud Functions**
- Payment processing
- Order management
- Notifications
- Stripe Connect

✅ **Documentation**
- Complete technical documentation
- User guides for all roles
- API documentation
- Deployment guides

### Next Steps

1. **Monitor TestFlight Feedback**
   - Gather beta tester feedback
   - Fix critical bugs
   - Iterate on UX

2. **App Store Review**
   - Respond to review feedback
   - Make required changes
   - Resubmit if needed

3. **Launch Marketing**
   - Prepare launch announcement
   - Coordinate PR and social media
   - Plan soft launch strategy

4. **Post-Launch**
   - Monitor analytics
   - Track user feedback
   - Plan feature iterations
   - Scale infrastructure as needed

---

**Total Project Duration:** 20 days  
**Total Development Hours:** 160 hours  
**Status:** ✅ COMPLETE

