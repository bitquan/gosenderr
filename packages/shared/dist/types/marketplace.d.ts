import { Timestamp } from "firebase/firestore";
export type ItemCondition = "new" | "used" | "refurbished";
export type ItemStatus = "draft" | "active" | "inactive" | "sold" | "archived";
export type ItemCategory = "electronics" | "furniture" | "clothing" | "food" | "books" | "toys" | "sports" | "tools" | "home" | "garden" | "other";
export interface MarketplaceItem {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerLogo?: string;
    title: string;
    description: string;
    shortDescription?: string;
    category: ItemCategory;
    subcategory?: string;
    tags?: string[];
    price: number;
    compareAtPrice?: number;
    currency: string;
    quantity: number;
    sku?: string;
    condition: ItemCondition;
    images: string[];
    thumbnail?: string;
    video?: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: "in" | "cm";
    };
    shippingAvailable?: boolean;
    pickupAvailable?: boolean;
    status: ItemStatus;
    isPromoted?: boolean;
    isFeatured?: boolean;
    featured?: boolean;
    views?: number;
    favorites?: number;
    sold?: number;
    stock?: number;
    rating?: number;
    publishedAt?: Timestamp;
}
export interface Address {
    id?: string;
    label?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    instructions?: string;
    isDefault?: boolean;
}
export interface OrderItem {
    itemId: string;
    title: string;
    thumbnail?: string;
    price: number;
    quantity: number;
    sku?: string;
    sellerId?: string;
}
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed" | "cancelled";
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
export type FulfillmentMethod = "pickup" | "shipping" | "courier_delivery";
export interface Order {
    id: string;
    orderNumber: string;
    orderType: "marketplace" | "delivery" | "both";
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    sellerId?: string;
    sellerName?: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    shippingFee?: number;
    serviceFee?: number;
    discount?: number;
    total: number;
    currency: string;
    paymentIntentId: string;
    paymentStatus: PaymentStatus;
    paidAt?: Timestamp;
    refundedAt?: Timestamp;
    refundAmount?: number;
    fulfillmentMethod: FulfillmentMethod;
    deliveryAddress?: Address;
    pickupLocation?: {
        sellerId: string;
        address: Address;
        instructions?: string;
    };
    deliveryId?: string;
    status: OrderStatus;
    customerNotes?: string;
    vendorNotes?: string;
    internalNotes?: string;
    statusHistory?: Array<{
        status: string;
        timestamp: Timestamp;
        note?: string;
    }>;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    completedAt?: Timestamp;
    cancelledAt?: Timestamp;
}
export interface SellerProfile {
    businessName: string;
    description: string;
    businessType: "individual" | "llc" | "corporation" | "partnership";
    logo?: string;
    banner?: string;
    stripeConnectId?: string;
    rating?: number;
    totalSales?: number;
    totalOrders?: number;
    joinedDate?: Timestamp;
    contactEmail?: string;
    contactPhone?: string;
    businessAddress?: Address;
    isActive?: boolean;
    categories?: string[];
}
export type SellerApplicationStatus = "pending" | "under_review" | "approved" | "rejected";
export interface SellerApplication {
    userId: string;
    email: string;
    displayName: string;
    businessName: string;
    businessDescription: string;
    businessType: "individual" | "llc" | "corporation" | "partnership";
    contactEmail: string;
    contactPhone: string;
    businessAddress: Address;
    taxId?: string;
    categories: string[];
    documents?: Array<{
        type: "business_license" | "tax_id" | "insurance" | "other";
        url: string;
        uploadedAt: Timestamp;
    }>;
    status: SellerApplicationStatus;
    reviewedBy?: string;
    reviewedAt?: Timestamp;
    rejectionReason?: string;
    adminNotes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface MarketplaceFilters {
    category?: ItemCategory;
    minPrice?: number;
    maxPrice?: number;
    condition?: ItemCondition;
    searchQuery?: string;
    sellerId?: string;
    sortBy?: "price" | "date" | "popularity";
    sortOrder?: "asc" | "desc";
}
export interface MarketplaceSearchResult {
    items: MarketplaceItem[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
}
