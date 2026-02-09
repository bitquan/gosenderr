"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FEATURE_FLAGS = exports.JobStatus = void 0;
// ==================== JOB STATUS ====================
var JobStatus;
(function (JobStatus) {
    JobStatus["OPEN"] = "open";
    JobStatus["ASSIGNED"] = "assigned";
    JobStatus["ENROUTE_PICKUP"] = "enroute_pickup";
    JobStatus["ARRIVED_PICKUP"] = "arrived_pickup";
    JobStatus["PICKED_UP"] = "picked_up";
    JobStatus["ENROUTE_DROPOFF"] = "enroute_dropoff";
    JobStatus["ARRIVED_DROPOFF"] = "arrived_dropoff";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["DISPUTED"] = "disputed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
exports.DEFAULT_FEATURE_FLAGS = {
    marketplace: {
        enabled: true,
        itemListings: true,
        combinedPayments: true,
        courierOffers: false,
    },
    delivery: {
        onDemand: true,
        routes: true,
        longRoutes: false,
        longHaul: false,
    },
    courier: {
        rateCards: true,
        equipmentBadges: true,
        workModes: true,
    },
    seller: {
        stripeConnect: true,
        multiplePhotos: true,
        foodListings: true,
    },
    customer: {
        liveTracking: true,
        proofPhotos: true,
        routeDelivery: false,
        packageShipping: true,
    },
    packageRunner: {
        enabled: true,
        hubNetwork: true,
        packageTracking: true,
    },
    admin: {
        courierApproval: true,
        equipmentReview: true,
        disputeManagement: true,
        analytics: true,
        featureFlagsControl: true,
        webPortalEnabled: false,
        systemLogs: false,
        firebaseExplorer: false,
    },
    advanced: {
        pushNotifications: true,
        ratingEnforcement: true,
        autoCancel: true,
        refunds: true,
    },
    ui: {
        modernStyling: true,
        darkMode: true,
        animations: true,
    },
    senderrplaceV2: {
        enabled: false,
        ads: false,
        badges: false,
        bookingLinks: false,
        adminControls: false,
    },
};
