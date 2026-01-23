# GoSenderR Terminology Guide

## Overview

This document describes the user-facing terminology used throughout the GoSenderR platform. The terminology has been carefully chosen to create a distinctive brand identity while maintaining database compatibility.

## Role Names

### Customer → **Order Up**

**Database field:** `customer`  
**Display name:** "Order Up"  
**Icon:** 📦  
**Color:** Blue (#3B82F6)  
**Tagline:** "Order Up, Sit Back"

Users who request delivery services and purchase items from the marketplace.

### Vendor → **Market Senderr**

**Database field:** `vendor`  
**Display name:** "Market Senderr"  
**Icon:** 🏪  
**Color:** Purple (#8B5CF6)  
**Tagline:** "Your Market. Your Rules."

Sellers who list items on the marketplace platform.

### Courier → **Senderr**

**Database field:** `courier`  
**Display name:** "Senderr"  
**Icon:** ⚡  
**Color:** Green (#10B981)  
**Tagline:** "Send It. Earn It. Your Way."

Delivery providers who fulfill local delivery requests (formerly called "Driver" or "Courier" in old code).

### Runner → **Shifter**

**Database field:** `package_runner` or `runner`  
**Display name:** "Shifter"  
**Icon:** 🚚  
**Color:** Orange (#F59E0B)  
**Tagline:** "Shift Packages. Shift Income."

Long-haul package delivery drivers who handle routes between hubs.

### Admin

**Database field:** `admin`  
**Display name:** "Admin"  
**Icon:** 👑  
**Color:** Red (#DC2626)

Platform administrators with full access.

## Common Terms

| Old Term | New Term | Context |
|----------|----------|---------|
| Delivery | Send | General delivery action (noun/verb) |
| Job | Send | Delivery request/task |
| Driver | Senderr | Reference to courier role |
| Runner | Shifter | Reference to package runner role |
| Route | Shift | Long-haul delivery route (for Shifters) |

## Implementation

### Code Structure

All role display logic is centralized in the shared package:

```typescript
// packages/shared/src/utils/roleDisplay.ts
export const ROLE_DISPLAY = {
  customer: { name: 'Order Up', ... },
  vendor: { name: 'Market Senderr', ... },
  courier: { name: 'Senderr', ... },
  package_runner: { name: 'Shifter', ... },
  runner: { name: 'Shifter', ... },
  admin: { name: 'Admin', ... }
}
```

### Usage Examples

```typescript
import { getRoleDisplay, getRoleName } from '@gosenderr/shared';

// Get full role display info
const roleInfo = getRoleDisplay('customer');
// Returns: { name: 'Order Up', icon: '📦', color: '#3B82F6', ... }

// Get just the name
const roleName = getRoleName('courier');
// Returns: 'Senderr'

// Use in UI
<h1>{getRoleDisplay('customer').name} Dashboard</h1>
// Renders: "Order Up Dashboard"
```

### Database Fields

**IMPORTANT:** Database field names remain unchanged for backwards compatibility:

- Firestore documents still use: `customer`, `vendor`, `courier`, `package_runner`, `runner`, `admin`
- TypeScript types still use: `UserRole = 'customer' | 'vendor' | 'courier' | 'package_runner' | 'runner' | 'admin'`
- Variable names in code can remain unchanged (e.g., `courierId`, `deliveryJob`)

Only **UI-facing text** uses the new terminology.

## Updated Pages

### Customer (Order Up) Pages
- `/customer/dashboard` - "Order Up Dashboard"
- `/customer/jobs` - "My Sends" instead of "My Jobs"
- `/customer/request-delivery` - "Request Send", "Available Sendrs"

### Courier (Senderr) Pages
- `/courier/dashboard` - "Available Sends" instead of "Available Jobs"
- `/courier/onboarding` - References to "Senderr"
- Status messages updated to use "send" terminology

### Runner (Shifter) Pages
- `/runner/dashboard` - "Total Shifts", "Active Shifter", "Recent Shifts"
- `/runner/available-routes` - Routes referred to as "shifts"

### Vendor (Market Senderr) Pages
- `/vendor/orders` - "Market Senderr Orders"
- `/vendor/settings` - "Market Senderr Settings"

### Admin Pages
- `/admin/users` - Uses `getRoleName()` to display role badges dynamically

## Components

### RoleBadge Component

Displays role with icon, name, and gradient background:

```tsx
<RoleBadge role="customer" size="md" />
// Renders badge with "Order Up" name and blue gradient
```

### Select Role Page

Role selection page uses `getRoleDisplay()` to show:
- Role name
- Role icon
- Role tagline
- Role description
- Role color scheme

## Style Guidelines

1. **Consistency:** Always use the new terminology in user-facing text
2. **Database:** Never change database field names
3. **Code:** Variable names can stay as-is (e.g., `courierId`, not `senderrId`)
4. **Utilities:** Use `getRoleDisplay()` and `getRoleName()` for dynamic text
5. **Branding:** Capitalize role names as shown (e.g., "Senderr", not "senderr")

## Migration Notes

- ✅ All UI text updated to new terminology
- ✅ Database fields remain unchanged
- ✅ Type definitions remain unchanged
- ✅ Shared utilities created for role display
- ✅ RoleBadge component created
- ✅ Admin pages use dynamic role names

## Future Considerations

- Marketing materials should use new terminology
- Email templates may need updates to match new terminology
- Documentation and help text should reference new role names
- Consider adding terminology hints/tooltips for new users
