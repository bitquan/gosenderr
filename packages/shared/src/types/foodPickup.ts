import { Timestamp } from "firebase/firestore";

export interface RestaurantLocation {
  address: string;
  lat: number;
  lng: number;
}

export interface FoodPickupRestaurant {
  courierId: string;
  courierName?: string;
  restaurantName: string;
  location: RestaurantLocation;
  cuisineTags: string[];
  notes?: string;
  pickupHours?: string;
  photoUrl?: string;
  photoStoragePath?: string;
  isPublic: boolean;
  lastUsedByUid?: string;
  lastUsedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FoodPickupRestaurantDoc extends FoodPickupRestaurant {
  id: string;
}

export interface FoodPickupRestaurantInput {
  courierId: string;
  courierName?: string;
  restaurantName: string;
  location: RestaurantLocation;
  cuisineTags?: string[];
  notes?: string;
  pickupHours?: string;
  photoUrl?: string;
  photoStoragePath?: string;
  isPublic?: boolean;
}
