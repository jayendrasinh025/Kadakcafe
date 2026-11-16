export type SecondaryActionType = 'waiter' | 'whatsapp' | 'call' | 'disabled';

export interface RestaurantSettings {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  brandColor: string;
  accentColor: string;
  isOpen: boolean;
  openingHours: string;
  contactNumber: string;
  whatsappNumber: string;
  googleReviewUrl: string;
  secondaryActionType: SecondaryActionType;
  scanCount: number;
  ownerId: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  ownerId: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isBestseller: boolean;
  isChefsPick: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  sortOrder: number;
  ownerId: string;
  updatedAt: string;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  label: string;
  scans: number;
  ownerId: string;
  updatedAt: string;
}

export interface WaiterCallAlert {
  id: string;
  tableNumber: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
}

export interface PrivateFeedbackNote {
  id: string;
  tableNumber: string;
  guestName?: string;
  message: string;
  createdAt: string;
}
