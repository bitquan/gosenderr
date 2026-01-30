// COURIER_APP_V2_FIRESTORE_SCHEMA.ts
// Define all Firestore collections and their exact TypeScript interfaces

export interface CourierProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  
  // Courier specific
  vehicle: {
    type: "bike" | "car" | "van";
    license?: string;
    insurance?: string;
  };
  
  // Ratings
  rating: number; // 0-5
  totalDeliveries: number;
  reviewCount: number;
  
  // Availability
  isActive: boolean;
  isOnline: boolean;
  lastOnlineAt: Date;
  
  // Documents
  documents: {
    licenseVerified: boolean;
    insuranceVerified: boolean;
    backgroundCheckPassed: boolean;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface CourierLocation {
  uid: string; // courier id
  lat: number;
  lng: number;
  accuracy: number; // meters
  speed?: number; // mph
  heading?: number; // degrees
  
  timestamp: Date;
  isAccurate: boolean; // true if accuracy < 30m
}

export interface Job {
  id: string;
  
  // Addresses
  pickup: {
    address: string;
    lat: number;
    lng: number;
    instructions?: string;
  };
  delivery: {
    address: string;
    lat: number;
    lng: number;
    instructions?: string;
  };
  
  // Details
  description: string;
  itemCount: number;
  weight?: number;
  
  // Pricing
  basePrice: number;
  distancePrice: number;
  totalPrice: number;
  
  // Status
  status: "pending" | "claimed" | "active" | "completed" | "cancelled";
  
  // Assignment
  courierUid?: string;
  claimedAt?: Date;
  
  // Tracking
  startedAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  
  // Proof
  proofPhotos?: string[]; // Firebase Storage URLs
  signature?: string; // Data URL
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface CourierEarnings {
  uid: string;
  
  // Today
  todayTotal: number;
  todayDeliveries: number;
  
  // This week
  weekTotal: number;
  weekDeliveries: number;
  
  // This month
  monthTotal: number;
  monthDeliveries: number;
  
  // All time
  allTimeTotal: number;
  allTimeDeliveries: number;
  
  // Last updated
  lastUpdated: Date;
}

// Firestore Collections
export const COLLECTIONS = {
  COURIERS: "couriers", // courier/{uid}
  JOBS: "jobs", // jobs/{jobId}
  COURIER_LOCATIONS: "courierLocations", // courierLocations/{uid}
  COURIER_EARNINGS: "courierEarnings", // courierEarnings/{uid}
  NOTIFICATIONS: "notifications", // notifications/{uid}/messages/{msgId}
} as const;

// Firestore Indexes
export const INDEXES = [
  {
    collection: "jobs",
    fields: ["status", "createdAt"],
    description: "Available jobs sorted by newest"
  },
  {
    collection: "jobs",
    fields: ["courierUid", "status", "createdAt"],
    description: "Courier's jobs by status"
  },
  {
    collection: "courierLocations",
    fields: ["timestamp"],
    description: "Location history"
  },
];

// Security Rule Functions
export const SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuth() {
      return request.auth != null;
    }
    
    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }
    
    function isCourier() {
      return isAuth() && 
        get(/databases/$(database)/documents/couriers/$(request.auth.uid)).data.isActive == true;
    }
    
    // Courier profile - only owner can read/write
    match /couriers/{uid} {
      allow read: if isOwner(uid);
      allow write: if isOwner(uid) && 
        request.resource.data.keys().hasOnly(['isOnline', 'lastOnlineAt', 'updatedAt']);
    }
    
    // Jobs - couriers can read, admins write
    match /jobs/{jobId} {
      allow read: if isCourier();
      allow write: if isAuth() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Courier locations - only own updates
    match /courierLocations/{uid} {
      allow write: if isOwner(uid);
      allow read: if false; // admin only via cloud function
    }
    
    // Courier earnings - only owner can read
    match /courierEarnings/{uid} {
      allow read: if isOwner(uid);
      allow write: if false; // cloud functions only
    }
  }
}
`;
