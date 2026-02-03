export interface FeatureFlags {
  marketplace: {
    enabled: boolean;
    itemListings: boolean;
    combinedPayments: boolean;
    courierOffers: boolean;
  };

  delivery: {
    onDemand: boolean;
    routes: boolean;
    longRoutes: boolean;
    longHaul: boolean;
  };

  courier: {
    rateCards: boolean;
    equipmentBadges: boolean;
    workModes: boolean;
    nativeV2: boolean;
    jobDetails: boolean;
    jobAlerts: boolean;
  };

  seller: {
    stripeConnect: boolean;
    multiplePhotos: boolean;
    foodListings: boolean;
  };

  customer: {
    liveTracking: boolean;
    proofPhotos: boolean;
    routeDelivery: boolean;
    packageShipping: boolean;
  };

  packageRunner: {
    enabled: boolean;
    hubNetwork: boolean;
    packageTracking: boolean;
  };

  admin: {
    courierApproval: boolean;
    equipmentReview: boolean;
    disputeManagement: boolean;
    analytics: boolean;
    featureFlagsControl: boolean;
    webPortalEnabled: boolean;
    systemLogs: boolean;
    firebaseExplorer: boolean;
  };

  advanced: {
    pushNotifications: boolean;
    backgroundLocation: boolean;
    ratingEnforcement: boolean;
    autoCancel: boolean;
    refunds: boolean;
  };

  ui: {
    modernStyling: boolean;
    darkMode: boolean;
    animations: boolean;
  };
}
