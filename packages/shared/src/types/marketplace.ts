import { Timestamp } from "firebase/firestore";

// ==================== MARKETPLACE TYPES ====================

// Item condition
export type ItemCondition = "new" | "used" | "refurbished";

// Item status
export type ItemStatus = "draft" | "active" | "inactive" | "sold" | "archived";

// Item category
export type ItemCategory =
  | "electronics"
  | "furniture"
  | "clothing"
  | "food"
  | "books"
  | "toys"
  | "sports"
  | "tools"
  | "home"
  | "garden"
  | "other";

// Marketplace Item
export interface MarketplaceItem {
  // Core Identity
  id: string;

  // Vendor Info
  vendorId: string;
  vendorName: string;
  vendorLogo?: string;

  // Item Details
  title: string;
  description: string;
  shortDescription?: string;

  // Classification
  category: ItemCategory;
  subcategory?: string;
  tags?: string[];

  // Pricing & Inventory
  price: number; // Price in cents
  compareAtPrice?: number; // Original price (for sales)
  currency: string; // Default: "USD"
  quantity: number; // Available quantity
  sku?: string; // Stock keeping unit

  // Item Condition
  condition: ItemCondition;

  // Media
  images: string[]; // Array of image URLs
  thumbnail?: string; // Main thumbnail
  video?: string; // Product video URL

  // Shipping
  weight?: number; // Weight in oz
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: "in" | "cm";
  };
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;

  // Status
  status: ItemStatus;
  isPromoted?: boolean;
  isFeatured?: boolean;

  // Stats
  views?: number;
  favorites?: number;
  sold?: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

// Address
export interface Address {
  id?: string;
  label?: string; // "Home", "Work", etc.
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string; // Delivery instructions
  isDefault?: boolean;
}

// Order Item
export interface OrderItem {
  itemId: string;
  title: string;
  thumbnail?: string;
  price: number; // Price at time of order
  quantity: number;
  sku?: string;
  vendorId?: string;
}

// Payment status
export type PaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "failed"
  | "cancelled";

// Order status
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

// Fulfillment method
export type FulfillmentMethod = "pickup" | "shipping" | "courier_delivery";

// Order
export interface Order {
  // Core Identity
  id: string;
  orderNumber: string; // e.g., "ORD-2024-001234"
  orderType: "marketplace" | "delivery" | "both";

  // Customer Info
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  // Vendor Info (for marketplace orders)
  vendorId?: string;
  vendorName?: string;

  // Order Items
  items: OrderItem[];

  // Pricing
  subtotal: number; // Items total (cents)
  tax: number; // Tax amount (cents)
  shippingFee?: number; // Shipping fee (cents)
  serviceFee?: number; // Platform fee (cents)
  discount?: number; // Discount amount (cents)
  total: number; // Final total (cents)
  currency: string; // Default: "USD"

  // Payment
  paymentIntentId: string; // Stripe payment intent ID
  paymentStatus: PaymentStatus;
  paidAt?: Timestamp;
  refundedAt?: Timestamp;
  refundAmount?: number;

  // Fulfillment
  fulfillmentMethod: FulfillmentMethod;

  // Delivery Address
  deliveryAddress?: Address;

  // Pickup Info (if applicable)
  pickupLocation?: {
    vendorId: string;
    address: Address;
    instructions?: string;
  };

  // Delivery Info (if using courier)
  deliveryId?: string; // Reference to delivery document

  // Order Status
  status: OrderStatus;

  // Notes
  customerNotes?: string;
  vendorNotes?: string;
  internalNotes?: string;

  // Tracking
  statusHistory?: Array<{
    status: string;
    timestamp: Timestamp;
    note?: string;
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

// Vendor Profile
export interface VendorProfile {
  businessName: string;
  description: string;
  businessType: "individual" | "llc" | "corporation" | "partnership";
  logo?: string;
  banner?: string;
  stripeConnectId?: string;

  // Stats
  rating?: number;
  totalSales?: number;
  totalOrders?: number;
  joinedDate?: Timestamp;

  // Contact
  contactEmail?: string;
  contactPhone?: string;
  businessAddress?: Address;

  // Settings
  isActive?: boolean;
  categories?: string[];
}

// Vendor Application status
export type VendorApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

// Vendor Application
export interface VendorApplication {
  // Applicant
  userId: string;
  email: string;
  displayName: string;

  // Business Info
  businessName: string;
  businessDescription: string;
  businessType: "individual" | "llc" | "corporation" | "partnership";

  // Contact
  contactEmail: string;
  contactPhone: string;

  // Address
  businessAddress: Address;

  // Tax Info
  taxId?: string; // EIN or SSN (encrypted)

  // Categories
  categories: string[]; // What they plan to sell

  // Documents
  documents?: Array<{
    type: "business_license" | "tax_id" | "insurance" | "other";
    url: string;
    uploadedAt: Timestamp;
  }>;

  // Status
  status: VendorApplicationStatus;

  // Review
  reviewedBy?: string; // Admin user ID
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  adminNotes?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Search filters
export interface MarketplaceFilters {
  category?: ItemCategory;
  minPrice?: number;
  maxPrice?: number;
  condition?: ItemCondition;
  searchQuery?: string;
  vendorId?: string;
  sortBy?: "price" | "date" | "popularity";
  sortOrder?: "asc" | "desc";
}

// Search result
export interface MarketplaceSearchResult {
  items: MarketplaceItem[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}
