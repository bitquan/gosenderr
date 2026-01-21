# Feature Flags System Documentation

## Overview

GoSenderr uses a simple feature flag system to enable gradual rollout and beta testing of new features. Feature flags are stored in Firestore and can be toggled via the admin dashboard.

## Architecture

### Data Model

Feature flags are stored in the `featureFlags` Firestore collection with the following schema:

```typescript
interface FeatureFlagDoc {
  key: string;               // e.g., "customer.packageShipping"
  category: string;          // "customer" | "delivery" | "admin" | "marketplace"
  enabled: boolean;          // Current state of the flag
  description: string;       // Human-readable description
  createdAt: Timestamp;      // When the flag was created
  updatedAt: Timestamp;      // When the flag was last modified
  updatedBy?: string;        // UID of admin who last modified
}
```

### Default Flags

The system comes with two default flags:

1. **customer.packageShipping**
   - Controls access to the `/ship` page
   - Enables package shipping features for customers
   - Default: disabled

2. **delivery.routes**
   - Controls access to the `/courier/routes` page
   - Enables the alternative routes view for couriers
   - Default: disabled

## Usage

### For Developers

#### Checking a Feature Flag

Use the `useFeatureFlag` hook to check if a feature is enabled:

```tsx
import { useFeatureFlag } from '@/hooks/v2/useFeatureFlag';

function MyComponent() {
  const { enabled, loading } = useFeatureFlag('customer.packageShipping');

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!enabled) {
    return <FeatureDisabledMessage />;
  }

  return <MyFeature />;
}
```

#### Gating a Page

Pages can be gated by checking the feature flag and redirecting or showing a message:

```tsx
export default function MyPage() {
  const { enabled, loading } = useFeatureFlag('my.feature');

  if (!enabled) {
    return <FeatureNotAvailableMessage />;
  }

  return <PageContent />;
}
```

See `/ship` and `/courier/routes` pages for examples.

### For Administrators

#### Accessing the Admin Dashboard

1. Navigate to `/admin/feature-flags`
2. You must be authenticated with an admin role
3. The page displays all feature flags grouped by category

#### Initializing Default Flags

If no flags exist:

1. Click "Initialize Default Flags" button
2. This creates the default flags (customer.packageShipping, delivery.routes)
3. All flags start in disabled state

#### Toggling a Feature Flag

1. Find the flag you want to toggle
2. Click the toggle button (shows current state: ✓ Enabled or ✗ Disabled)
3. The flag updates in real-time across all clients
4. Your UID is recorded in the `updatedBy` field

## Security

### Firestore Rules

Feature flags have the following security rules:

```javascript
match /featureFlags/{flagKey} {
  // Anyone authenticated can read feature flags
  allow read: if signedIn();
  
  // Only admins can create, update, or delete feature flags
  allow create, update: if isAdmin()
    && request.resource.data.category in ['customer', 'delivery', 'admin', 'marketplace']
    && request.resource.data.enabled is bool
    && request.resource.data.description is string;
  
  allow delete: if isAdmin();
}
```

This ensures that:
- All authenticated users can read flags (needed for client-side checks)
- Only admins can modify flags
- Flag data structure is validated on write

## Real-time Updates

Feature flags use Firestore real-time listeners, so changes are reflected immediately:

1. Admin toggles flag in dashboard
2. All connected clients receive the update via WebSocket
3. Components re-render with new flag state
4. No page refresh required

## Beta Testing Workflow

### Phase 1: Feature Development

1. Develop feature behind a feature flag check
2. Create the feature flag in Firestore (via admin dashboard)
3. Keep flag disabled during development
4. Test with flag manually enabled in local environment

### Phase 2: Internal Testing

1. Enable flag via admin dashboard
2. Test with small group of internal users
3. Monitor for issues
4. Disable flag quickly if problems found

### Phase 3: Limited Beta

1. Enable flag for specific user groups (future enhancement)
2. Collect feedback
3. Fix issues discovered
4. Expand to larger group

### Phase 4: General Availability

1. Enable flag for all users
2. Monitor performance and usage
3. Once stable, consider removing flag and making feature permanent

## Monitoring

### Firebase Console

Monitor feature flag usage via:

1. **Firestore Console**: View flag states and update history
2. **Client Logs**: Check for feature flag errors in browser console
3. **Cloud Functions Logs**: Monitor any server-side flag checks (future)

### Recommended Metrics

Track the following for beta features:

- **Usage Rate**: How many users access the gated page?
- **Error Rate**: Do flag-gated pages have higher error rates?
- **Performance**: Do flag checks impact page load time?
- **User Feedback**: Collect qualitative feedback from beta users

## Adding New Feature Flags

To add a new feature flag:

1. **Design the flag**:
   - Choose a descriptive key (format: `category.featureName`)
   - Write clear description
   - Determine category

2. **Add via Admin UI**:
   - Currently, use `setDoc` in browser console:
   ```js
   await setDoc(doc(db, 'featureFlags', 'my.feature'), {
     key: 'my.feature',
     category: 'customer',
     enabled: false,
     description: 'My new feature',
     createdAt: Timestamp.now(),
     updatedAt: Timestamp.now(),
     updatedBy: currentUser.uid
   });
   ```
   - Future: Add "Create New Flag" UI in admin dashboard

3. **Implement the gate**:
   - Use `useFeatureFlag` hook in your component
   - Show appropriate message when disabled

4. **Test**:
   - Test with flag disabled (default state)
   - Test with flag enabled
   - Test real-time toggle behavior

## Best Practices

### Do's

- ✅ Use feature flags for risky or incomplete features
- ✅ Document what each flag controls
- ✅ Remove flags once features are stable and proven
- ✅ Test both enabled and disabled states
- ✅ Show clear messages when features are disabled

### Don'ts

- ❌ Don't use feature flags for permanent configuration
- ❌ Don't create too many flags (adds complexity)
- ❌ Don't forget to remove flags after rollout completes
- ❌ Don't check flags on every render (use hook which memoizes)
- ❌ Don't leave flags in codebase indefinitely

## Troubleshooting

### Flag not updating in real-time

1. Check browser console for WebSocket errors
2. Verify Firestore rules allow read access
3. Check network tab for firestore requests
4. Try refreshing the page

### Cannot toggle flag

1. Verify you're logged in as admin
2. Check Firestore rules for admin role check
3. Look for errors in browser console
4. Verify flag document exists in Firestore

### Page shows "Feature Not Available" despite flag enabled

1. Clear browser cache and cookies
2. Check if flag key matches exactly (case-sensitive)
3. Verify flag exists in Firestore with correct key
4. Check component is using correct flag key

## Future Enhancements

Potential improvements to the feature flag system:

1. **User-level flags**: Enable flags for specific users or user groups
2. **Environment-based flags**: Different flag states for dev/staging/prod
3. **Scheduled rollouts**: Auto-enable flags at specified times
4. **A/B testing**: Randomly assign users to flag variants
5. **Flag analytics**: Track flag usage and impact metrics
6. **Flag dependencies**: Ensure prerequisite flags are enabled
7. **Create flag UI**: Add form in admin dashboard to create new flags
8. **Flag history**: Track all changes to flag states over time

## Related Documentation

- [Admin Dashboard](./ADMIN_DASHBOARD.md)
- [Beta Testing Guide](./BETA_TESTING.md) (to be created)
- [Firestore Security Rules](../firebase/firestore.rules)

---

**Last Updated**: January 2026  
**Maintained By**: GoSenderr Development Team
