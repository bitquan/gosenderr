export const COURIER_PROFILE_SCHEMA_VERSION = 1 as const;
export const COURIER_DEFAULT_SERVICE_RADIUS_MILES = 15;
export const COURIER_MIN_SERVICE_RADIUS_MILES = 1;
export const COURIER_MAX_SERVICE_RADIUS_MILES = 100;

export type CourierAvailability = 'available' | 'busy' | 'offline';
export type CourierProfileStatus =
  | 'pending'
  | 'pending_review'
  | 'pending_docs'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'suspended'
  | 'banned';
export type CourierWorkModes = {
  packagesEnabled: boolean;
  foodEnabled: boolean;
};
export type CourierNotificationPreferences = {
  jobOffers: boolean;
  payoutUpdates: boolean;
  reminders: boolean;
};
export type CourierDocumentType = 'government_id' | 'vehicle_registration' | 'insurance';
export type CourierDocumentStatus = 'not_uploaded' | 'pending_review' | 'approved' | 'rejected';
export type CourierDocument = {
  type: CourierDocumentType;
  label: string;
  status: CourierDocumentStatus;
  url?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  rejectedReason?: string;
};
export type CourierEquipmentType =
  | 'insulated_bag'
  | 'cooler'
  | 'hot_bag'
  | 'drink_carrier'
  | 'dolly'
  | 'straps'
  | 'furniture_blankets';
export type CourierEquipmentItem = {
  has: boolean;
  photoUrl?: string;
  approved: boolean;
  approvedAt?: string;
  rejectedReason?: string;
};
export type CourierEquipment = Record<CourierEquipmentType, CourierEquipmentItem>;
export type CourierCapabilities = {
  canDeliverHot: boolean;
  canDeliverCold: boolean;
  canDeliverFrozen: boolean;
  canDeliverDrinks: boolean;
  canDeliverHeavy: boolean;
  canDeliverFurniture: boolean;
};
export type CourierStripeState = {
  connectAccountId: string;
  accountStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  requirementsPastDue: string[];
};
export type CourierPayoutMode = 'stripe_connect' | 'external_provider' | 'manual_settlement';
export type CourierStats = {
  todayJobs: number;
  completedJobs: number;
};
export type CourierBadgeId =
  | 'hot_delivery'
  | 'cold_delivery'
  | 'drink_delivery'
  | 'heavy_lift'
  | 'furniture_ready';
export type CourierBadge = {
  id: CourierBadgeId;
  label: string;
  earned: boolean;
  reason: string;
};

export type CourierOptionalFee = {
  name: string;
  amount: number;
};

export type CourierPackagesRateCard = {
  baseFare: number;
  perMile: number;
  perMinute: number;
  optionalFees: CourierOptionalFee[];
};

export type CourierFoodRateCard = {
  baseFare: number;
  perMile: number;
  restaurantWaitPay: number;
  optionalFees: CourierOptionalFee[];
};

export type CourierRateCards = {
  packages: CourierPackagesRateCard;
  food: CourierFoodRateCard;
};

export type CourierVehicleMetadata = {
  makeModel: string;
  plateNumber: string;
  color: string;
};

export type CourierSettings = {
  acceptsNewJobs: boolean;
  autoStartTracking: boolean;
};

export const COURIER_DOCUMENT_ORDER: CourierDocumentType[] = [
  'government_id',
  'vehicle_registration',
  'insurance',
];

export const COURIER_DOCUMENT_LABELS: Record<CourierDocumentType, string> = {
  government_id: 'Government ID',
  vehicle_registration: 'Vehicle Registration',
  insurance: 'Insurance',
};

export const COURIER_EQUIPMENT_TYPES: CourierEquipmentType[] = [
  'insulated_bag',
  'cooler',
  'hot_bag',
  'drink_carrier',
  'dolly',
  'straps',
  'furniture_blankets',
];

export const COURIER_EQUIPMENT_LABELS: Record<CourierEquipmentType, string> = {
  insulated_bag: 'Insulated Bag',
  cooler: 'Cooler',
  hot_bag: 'Hot Bag',
  drink_carrier: 'Drink Carrier',
  dolly: 'Dolly / Hand Truck',
  straps: 'Straps',
  furniture_blankets: 'Furniture Blankets',
};

export const buildDefaultCourierEquipment = (): CourierEquipment =>
  Object.fromEntries(
    COURIER_EQUIPMENT_TYPES.map(type => [
      type,
      {
        has: false,
        approved: false,
      } satisfies CourierEquipmentItem,
    ]),
  ) as CourierEquipment;

export const buildDefaultCourierDocuments = (): CourierDocument[] =>
  COURIER_DOCUMENT_ORDER.map(type => ({
    type,
    label: COURIER_DOCUMENT_LABELS[type],
    status: 'not_uploaded',
  }));

export const deriveCourierCapabilities = (equipment: CourierEquipment): CourierCapabilities => ({
  canDeliverHot: Boolean(equipment.hot_bag.approved || equipment.insulated_bag.approved),
  canDeliverCold: Boolean(equipment.cooler.approved || equipment.insulated_bag.approved),
  canDeliverFrozen: Boolean(equipment.cooler.approved),
  canDeliverDrinks: Boolean(equipment.drink_carrier.approved),
  canDeliverHeavy: Boolean(equipment.dolly.approved && equipment.straps.approved),
  canDeliverFurniture: Boolean(
    equipment.dolly.approved &&
      equipment.straps.approved &&
      equipment.furniture_blankets.approved,
  ),
});

export const deriveCourierBadges = (capabilities: CourierCapabilities): CourierBadge[] => [
  {
    id: 'hot_delivery',
    label: 'Hot Delivery',
    earned: capabilities.canDeliverHot,
    reason: capabilities.canDeliverHot ? 'Hot-bag capable.' : 'Requires approved insulated bag or hot bag.',
  },
  {
    id: 'cold_delivery',
    label: 'Cold Delivery',
    earned: capabilities.canDeliverCold,
    reason: capabilities.canDeliverCold ? 'Cold-chain capable.' : 'Requires approved cooler or insulated bag.',
  },
  {
    id: 'drink_delivery',
    label: 'Drink Runner',
    earned: capabilities.canDeliverDrinks,
    reason: capabilities.canDeliverDrinks ? 'Drink-safe setup ready.' : 'Requires approved drink carrier.',
  },
  {
    id: 'heavy_lift',
    label: 'Heavy Lift',
    earned: capabilities.canDeliverHeavy,
    reason: capabilities.canDeliverHeavy ? 'Heavy-package setup ready.' : 'Requires approved dolly and straps.',
  },
  {
    id: 'furniture_ready',
    label: 'Furniture Ready',
    earned: capabilities.canDeliverFurniture,
    reason: capabilities.canDeliverFurniture
      ? 'Furniture moves enabled.'
      : 'Requires approved dolly, straps, and furniture blankets.',
  },
];

export type CourierPackagesRateCardDraft = {
  baseFare: string;
  perMile: string;
  perMinute: string;
  optionalFees: CourierOptionalFee[];
};

export type CourierFoodRateCardDraft = {
  baseFare: string;
  perMile: string;
  restaurantWaitPay: string;
  optionalFees: CourierOptionalFee[];
};

export type CourierRateCardsDraft = {
  packages: CourierPackagesRateCardDraft;
  food: CourierFoodRateCardDraft;
};

export type CourierProfile = {
  schemaVersion: typeof COURIER_PROFILE_SCHEMA_VERSION;
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profilePhotoUrl?: string;
  status: CourierProfileStatus;
  rejectionReason?: string;
  availability: CourierAvailability;
  isOnline: boolean;
  lastOnlineAt?: string;
  serviceRadiusMiles: number;
  taxState: string;
  vehicle: CourierVehicleMetadata;
  workModes: CourierWorkModes;
  notificationPrefs: CourierNotificationPreferences;
  settings: CourierSettings;
  documents: CourierDocument[];
  equipment: CourierEquipment;
  capabilities: CourierCapabilities;
  payoutMode: CourierPayoutMode;
  externalPayoutProvider: string;
  externalPayoutHandle: string;
  stripe: CourierStripeState;
  stats: CourierStats;
  rateCards: CourierRateCards;
  updatedAt: string;
};

export type CourierProfileDraft = {
  fullName: string;
  phoneNumber: string;
  profilePhotoUrl: string;
  status: CourierProfileStatus;
  rejectionReason: string;
  availability: CourierAvailability;
  isOnline: boolean;
  serviceRadiusMiles: string;
  taxState: string;
  vehicle: CourierVehicleMetadata;
  workModes: CourierWorkModes;
  notificationPrefs: CourierNotificationPreferences;
  settings: CourierSettings;
  documents: CourierDocument[];
  equipment: CourierEquipment;
  payoutMode: CourierPayoutMode;
  externalPayoutProvider: string;
  externalPayoutHandle: string;
  stripe: CourierStripeState;
  stats: CourierStats;
  rateCards: CourierRateCardsDraft;
};
