# Synced Architecture Documentation

Complete, synchronized role-based architecture documentation for the GoSenderr platform.

## 📚 Documentation Structure

```
synced-architecture/
├── 00-INDEX.md                 # Master index with data flow diagrams
├── 01-CUSTOMER-ROLE.md         # Customer role specification
├── 02-COURIER-ROLE.md          # Courier role specification
├── 03-RUNNER-ROLE.md           # Runner/Shifter role specification
├── 04-VENDOR-ROLE.md           # Vendor/Seller role specification
├── 05-ADMIN-ROLE.md            # Admin role specification
└── README.md                   # This file
```

## 🎯 What's Included

Each role document contains:

### ✅ Complete Data Structures
- Firestore user document schemas
- Collection structures with TypeScript interfaces
- Field-level documentation

### ✅ Security Rules
- Complete Firestore security rules for each role
- Permission matrices
- Helper functions
- Access patterns

### ✅ Cloud Functions
- All triggered functions (onCreate, onUpdate)
- Scheduled functions (cron jobs)
- HTTP callable functions
- Complete code examples with explanations

### ✅ Inter-Role Data Flows
- Step-by-step interaction diagrams
- Data state changes
- Trigger sequences
- Payment flows

### ✅ Permissions
- What each role CAN do
- What each role CANNOT do
- Security boundaries
- Access controls

### ✅ Real-World Examples
- Complete workflows
- API calls
- Database transactions
- Error handling

## 📖 How to Use This Documentation

### For Developers
1. Start with [00-INDEX.md](./00-INDEX.md) for system overview
2. Review the data flow diagrams for your feature
3. Reference specific role docs for implementation details
4. Check Cloud Functions reference for backend logic
5. Verify security rules match your requirements

### For Product/Design
1. Read role identity sections for user experience context
2. Review inter-role interactions for feature planning
3. Check permissions matrices for feature feasibility
4. Use workflows to understand user journeys

### For QA/Testing
1. Use workflows as test scenarios
2. Verify data flows match expected behavior
3. Check permissions for security testing
4. Review Cloud Functions for edge cases

## 🔍 Key Features Documented

### Multi-Role System
- **Customer** (👤): Request deliveries, order items, ship packages
- **Courier** (🚗): Accept local delivery jobs (<50 miles)
- **Runner** (🚚): Transport packages on long-haul routes (50-200+ miles)
- **Vendor** (🏪): Sell items with integrated delivery
- **Admin** (⚙️): Oversee platform, manage users, resolve disputes

### Core Flows
1. **Local Delivery**: Customer → Courier → Delivery → Rating
2. **Marketplace Order**: Customer → Vendor → Courier → Delivery
3. **Package Shipping**: Customer → Hub → Runner → Hub → Last-Mile Courier
4. **Runner Approval**: Application → Admin Review → Approval → Active

### Cloud Infrastructure
- **Firestore**: Real-time database with security rules
- **Cloud Functions**: 12+ scheduled and triggered functions
- **Stripe**: Payment processing and Connect payouts
- **Firebase Auth**: Custom claims for role-based access
- **Cloud Storage**: Photos, documents, proof of delivery

## 🔄 Data Synchronization

All docs are **synced** meaning:
- ✅ Consistent naming across all roles
- ✅ Matching field structures
- ✅ Aligned Cloud Functions references
- ✅ Cross-referenced data flows
- ✅ Unified security rules
- ✅ Shared type definitions

## 🚀 Quick Start

```bash
# Read master index for overview
open docs/synced-architecture/00-INDEX.md

# Study specific role
open docs/synced-architecture/01-CUSTOMER-ROLE.md

# Understand a complete flow
# See "Data Flow Diagrams" in 00-INDEX.md
```

## 📊 Documentation Stats

- **Total Pages**: 6 documents
- **Total Lines**: 6,500+ lines
- **Diagrams**: 10+ data flow diagrams
- **Collections**: 13 Firestore collections
- **Cloud Functions**: 12+ functions documented
- **Security Rules**: 100+ rule definitions
- **Workflows**: 20+ complete examples

## 🔧 Maintenance

### Updating Documentation
When making changes to the platform:

1. **Update affected role docs** with new features
2. **Sync changes** across related role docs
3. **Update 00-INDEX.md** with new flows/collections
4. **Verify security rules** match implementation
5. **Test data flows** match documentation

### Version History
- **v1.0** (Jan 23, 2026): Initial synced architecture documentation

## ❓ FAQ

### Why "synced" architecture?
Previous role docs were created independently and had inconsistencies in naming, data structures, and references. This synced version ensures all docs align perfectly with each other and the actual implementation.

### How do I know if a feature is implemented?
Each document shows the current state. Cloud Functions shown are deployed. Security rules shown are active. If something is marked "future" it means planned but not yet built.

### What if I find inconsistencies?
File an issue or PR. All docs should match. If they don't, either the docs need updating or the code does.

### Can I use these as API documentation?
Yes! The Firestore schemas and Cloud Functions are accurate representations of the backend API. Use TypeScript interfaces as contract definitions.

## 📞 Contact

Questions? Reach out to the engineering team or file an issue.

---

**Last Updated**: January 23, 2026  
**Maintained By**: GoSenderr Engineering Team
