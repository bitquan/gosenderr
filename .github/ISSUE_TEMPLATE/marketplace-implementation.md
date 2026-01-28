# 🛍️ Marketplace Implementation - Phase 1 & 2

## Overview

Implement the core marketplace functionality for GoSenderR, enabling vendors to list items and customers to browse and purchase them.

**Timeline:** 4 weeks (Phases 1-2 from ROADMAP.md)  
**Priority:** High  
**Labels:** `feature`, `marketplace`, `phase-1`, `phase-2`

---

## 📋 Phase 1: Foundation (Week 1-2)

### Week 1: Infrastructure Setup

- [ ] **Firebase Configuration**
  - [ ] Verify Firestore is enabled
  - [ ] Set up authentication (Email/Password)
  - [ ] Configure Cloud Storage for images
  - [ ] Set up Firebase Hosting
  - [ ] Test Firebase Emulators locally

- [ ] **User Schema & Authentication**
  - [ ] Create `users` collection schema (see DATABASE_SCHEMA.md)
  - [ ] Implement role-based user model
  - [ ] Build login page with role selector
  - [ ] Build signup page with role selection
  - [ ] Add password reset flow
  - [ ] Test multi-role support

- [ ] **Role-Based Routing**
  - [ ] Create `RoleGuard` component
  - [ ] Implement `ProtectedRoute` wrapper
  - [ ] Set up role verification middleware
  - [ ] Add unauthorized access handler
  - [ ] Create role-aware navigation

### Week 2: Marketplace UI

- [ ] **Marketplace Home Page** (`/` and `/marketplace`)
  - [ ] Create marketplace layout
  - [ ] Build item grid component
  - [ ] Add category navigation bar
  - [ ] Implement search bar
  - [ ] Create filter sidebar (category, price, condition)
  - [ ] Add loading states and skeletons

- [ ] **Components**
  - [ ] `ItemCard` component
  - [ ] `ItemGrid` component  
  - [ ] `FilterSidebar` component
  - [ ] `SearchBar` component
  - [ ] `CategoryNav` component

- [ ] **Navigation**
  - [ ] Header component (role-aware)
  - [ ] Footer component
  - [ ] Sidebar navigation
  - [ ] Role switcher component

**Deliverables:**
- ✅ Users can sign up and login
- ✅ Role selection works at login
- ✅ Marketplace displays vendor items
- ✅ Basic navigation functional
- ✅ Firebase Emulators running locally

---

## 📋 Phase 2: Core Marketplace (Week 3-4)

### Week 3: Item Management & Details

- [ ] **Item Detail Page** (`/marketplace/:itemId`)
  - [ ] Item image gallery (with zoom/lightbox)
  - [ ] Product description section
  - [ ] Pricing display
  - [ ] Vendor info card
  - [ ] Add to cart button
  - [ ] Share button
  - [ ] Favorite/save button

- [ ] **Image Management**
  - [ ] Multi-image upload component
  - [ ] Image compression before upload
  - [ ] Thumbnail generation
  - [ ] Upload to Firebase Storage
  - [ ] Image URL management
  - [ ] Delete image functionality

- [ ] **Shopping Cart**
  - [ ] Cart context/state management
  - [ ] Add/remove items
  - [ ] Update quantities
  - [ ] Calculate subtotal
  - [ ] Persist cart to localStorage
  - [ ] Cart sidebar/modal

### Week 4: Checkout & Orders

- [ ] **Stripe Integration**
  - [ ] Set up Stripe account (test mode)
  - [ ] Install Stripe SDK
  - [ ] Create Stripe payment intent
  - [ ] Build checkout page
  - [ ] Implement payment confirmation
  - [ ] Handle payment errors
  - [ ] Test webhook locally

- [ ] **Order Creation**
  - [ ] Create `orders` collection (see DATABASE_SCHEMA.md)
  - [ ] Implement `createOrder` Cloud Function
  - [ ] Order confirmation page
  - [ ] Send order confirmation email
  - [ ] Update item inventory after purchase
  - [ ] Create order tracking

- [ ] **Search & Filters**
  - [ ] Full-text search (Firestore or Algolia)
  - [ ] Category filtering
  - [ ] Price range slider
  - [ ] Condition filters
  - [ ] Sort options (price, date, popularity)
  - [ ] Pagination with "Load More"

**Deliverables:**
- ✅ Customers can browse items
- ✅ Customers can view item details
- ✅ Customers can add items to cart
- ✅ Customers can complete checkout
- ✅ Orders created in Firestore
- ✅ Payment processing works (test mode)
- ✅ Search and filters functional

---

## 🗄️ Database Collections

### Collections to Create:

1. **`users/{userId}`** - See DATABASE_SCHEMA.md
2. **`marketplaceItems/{itemId}`** - See DATABASE_SCHEMA.md
3. **`orders/{orderId}`** - See DATABASE_SCHEMA.md
4. **`categories/{categoryId}`** - Optional, for category management

---

## 🔐 Security Rules

### Firestore Rules to Add:

```javascript
// marketplace items
match /marketplaceItems/{itemId} {
  allow read: if resource.data.status == 'active';
  allow create: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isVendor == true;
  allow update, delete: if request.auth.uid == resource.data.vendorId;
}

// orders
match /orders/{orderId} {
  allow read: if request.auth.uid == resource.data.customerId
    || request.auth.uid == resource.data.vendorId;
  allow create: if request.auth.uid == request.resource.data.customerId;
  allow update: if request.auth.uid == resource.data.vendorId;
}
```

---

## 🎯 Success Metrics

- [ ] Users can sign up in < 1 minute
- [ ] Marketplace loads in < 2 seconds
- [ ] Checkout completion rate > 80%
- [ ] Payment success rate > 95%
- [ ] Zero payment processing errors
- [ ] Search returns results < 500ms

---

## 🧪 Testing Checklist

- [ ] User registration flow
- [ ] User login with role selection
- [ ] Browse marketplace items
- [ ] View item details
- [ ] Add items to cart
- [ ] Remove items from cart
- [ ] Apply filters
- [ ] Search functionality
- [ ] Complete checkout flow
- [ ] Payment success handling
- [ ] Payment failure handling
- [ ] Order confirmation display
- [ ] Email notifications

---

## 📁 Files to Create/Modify

### New Files:
```
apps/customer-app/src/
├── pages/
│   ├── home/page.tsx                    # Marketplace home
│   ├── marketplace/
│   │   ├── page.tsx                     # Browse items
│   │   ├── [itemId]/page.tsx            # Item detail
│   │   └── checkout/page.tsx            # Checkout
│   └── auth/
│       ├── login/page.tsx               # Login with roles
│       └── signup/page.tsx              # Signup with roles
├── components/
│   ├── marketplace/
│   │   ├── ItemCard.tsx
│   │   ├── ItemGrid.tsx
│   │   ├── FilterSidebar.tsx
│   │   └── SearchBar.tsx
│   ├── cart/
│   │   ├── CartSidebar.tsx
│   │   └── CartItem.tsx
│   └── auth/
│       ├── RoleGuard.tsx
│       └── ProtectedRoute.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   ├── useMarketplace.ts
│   └── useCart.ts
└── lib/
    └── api/
        ├── marketplace.ts
        └── orders.ts
```

### Firebase Functions:
```
firebase/functions/src/
├── marketplace/
│   ├── createItem.ts
│   ├── updateItem.ts
│   └── searchItems.ts
└── orders/
    ├── createOrder.ts
    ├── confirmOrder.ts
    └── updateOrderStatus.ts
```

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [ROADMAP.md](../ROADMAP.md)
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)

---

## 💬 Questions/Blockers

_Add any questions or blockers here as you work_

---

## 📝 Progress Updates

_Add progress updates here as you complete tasks_

### [Date] - [Your Name]
- Completed: [tasks]
- Next: [upcoming tasks]
- Blockers: [any issues]
