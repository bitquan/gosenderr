# GoSenderR App Architecture Plan

## Overview
Simplified architecture with 3 main web apps focused on clear role separation.

---

## 🎯 Final Architecture (3 Apps)

### 1. **Main Marketplace App** 🛍️
**Location:** `apps/marketplace-app/`  
**Domain:** `gosenderr.com` (main domain)  
**Port:** 5173 (dev)  
**Firebase Hosting:** `gosenderr-customer`

**Roles Handled:**
- ✅ **Customer** - Browse marketplace, shop, checkout, view orders
- ✅ **Vendor** - Dashboard, list items, manage inventory, process orders

**Routes:**
- `/` - Marketplace home
- `/marketplace` - Browse items
- `/marketplace/:itemId` - Item detail
- `/marketplace/checkout` - Checkout flow
- `/orders` - Customer orders
- `/orders/:orderId` - Order detail
- `/vendor/dashboard` - Vendor overview
- `/vendor/items/new` - Create listing
- `/vendor/items/:id/edit` - Edit item
- `/vendor/orders` - Vendor orders

**Status:** ✅ **IN PROGRESS** - Phase 3 complete (customers + vendors working)

---

### 2. **Delivery Workers App** 🚚
**Location:** `apps/courier-app/` (merge with shifter-app later)  
**Domain:** `senderrs.gosenderr.com` or `workers.gosenderr.com`  
**Port:** 5174 (dev)  
**Firebase Hosting:** `gosenderr-courier`

**Roles Handled:**
- **Courier** (Senderrs) - Accept deliveries, navigation, track earnings
- **Runner** (Shifters) - Package pickup/delivery jobs, shift management

**Routes:**
- `/` - Dashboard with available jobs
- `/jobs` - Browse delivery opportunities
- `/jobs/:jobId` - Job details with navigation
- `/earnings` - Track income
- `/schedule` - Manage availability

**Status:** 🔜 **FUTURE** - Existing courier-app to be enhanced later

---

### 3. **Admin Panel** 🛡️
**Location:** `apps/admin-app/`  
**Domain:** `admin.gosenderr.com`  
**Port:** 3000 (dev)  
**Firebase Hosting:** `gosenderr-admin`

**Roles Handled:**
- **Admin** - Platform management, moderation, analytics

**Existing Routes:**
- ✅ `/dashboard` - Platform overview
- ✅ `/users` - User management
- ✅ `/jobs` - Delivery jobs monitoring
- ✅ `/disputes` - Handle disputes
- ✅ `/courier-approval` - Approve couriers
- ✅ `/revenue` - Revenue analytics
- ✅ `/audit-logs` - Activity logs
- ✅ `/feature-flags` - Toggle features
- ✅ `/settings` - Platform settings

**Marketplace Routes (TO ADD):**
- 🔜 `/marketplace` - View/moderate all vendor items
- 🔜 `/marketplace/:itemId` - Item moderation detail
- 🔜 `/orders` - View all marketplace orders
- 🔜 `/orders/:orderId` - Order detail

**Status:** 🔄 **NEEDS MARKETPLACE FEATURES** - Add marketplace admin pages

---

### 4. **Landing/Marketing Site** (Optional) 🌐
**Location:** `apps/web/`  
**Domain:** `www.gosenderr.com` or landing page  
**Port:** 3003 (dev)  
**Framework:** Next.js

**Purpose:**
- Public marketing website
- SEO landing pages
- Company info, pricing, etc.

**Status:** ⏸️ **LOW PRIORITY** - Focus on core apps first

---

## 📋 Current Focus

### ✅ Phase 1-3 Complete (Customer App)
- Marketplace browsing ✅
- Shopping cart ✅
- Stripe checkout ✅
- Customer orders ✅
- Vendor dashboard ✅
- Vendor item creation ✅
- Vendor order management ✅
- Vendor analytics ✅

### 🔄 Current Task: Admin Marketplace Features
**Goal:** Add marketplace moderation to admin-app

**Priority Order:**
1. **Marketplace Items Page** - View all items, approve/remove/feature
2. **Marketplace Orders Page** - View all orders, intervene if needed
3. **Enhanced Dashboard** - Add marketplace stats to admin dashboard

### 🔜 Future Enhancements
- Product reviews/ratings
- Customer wishlist
- Export functionality
- Email notifications
- Stripe webhooks
- Delivery worker app improvements

---

## 🎯 Key Principles

1. **Single Marketplace Domain** - gosenderr.com handles both customers AND vendors
2. **Role-Based UI** - Same app, different views based on user role
3. **Shared Components** - Vendors are customers who also sell, reuse UI components
4. **Clear Separation** - Workers (couriers/runners) separate from marketplace
5. **Admin Isolation** - Admin panel completely separate for security

---

## 🚀 Deployment Strategy

**Production Domains:**
- `gosenderr.com` → marketplace-app (marketplace)
- `workers.gosenderr.com` → courier-app (delivery workers)
- `admin.gosenderr.com` → admin-app (platform management)

**Firebase Hosting Sites:**
- `gosenderr-customer` (main marketplace)
- `gosenderr-courier` (workers)
- `gosenderr-admin` (admin panel)

---

## 📝 Notes

- **Vendor-app is merged into marketplace-app** - Vendors use `/vendor/*` routes in marketplace-app
- **Shifter-app can be merged into courier-app** - Both are delivery workers
- **Admin needs marketplace pages added** - Current admin only handles delivery business
- **All apps share Firebase backend** - Same Firestore, Auth, Storage, Functions

---

## ⚠️ DO NOT Build
- ❌ Separate vendor-app (use marketplace-app with `/vendor/*` routes)
- ❌ Separate shifter-app (merge into courier-app when ready)
- ❌ Multiple marketplace apps (one app, multiple roles)

---

## ✅ DO Build
- ✅ Marketplace features in marketplace-app (customers + vendors)
- ✅ Marketplace admin in admin-app (moderation + monitoring)
- ✅ Shared components between customer/vendor views
- ✅ Role-based routing and UI

---

**Last Updated:** January 28, 2026  
**Status:** Building marketplace admin features in admin-app
