/**
 * Shared doc types used by both the engine and the per-niche data files.
 * These mirror the Mongo shapes loosely (only the fields the generator needs).
 */

export interface UserDoc {
  _id: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export interface ProductDoc {
  _id: string;
  name: string;
  slug: string;
  price: number;
  hasVariants: boolean;
  variants: {
    sku: string;
    attributes: Record<string, string>;
    price: number;
    stock: number;
  }[];
  offerPrice: {
    type: "flat" | "percentage";
    value: number;
    startAt: string;
    endAt: string;
    isActive: boolean;
  } | null;
  reviews: string[];
  averageRating: number;
  ratingCount: number;
  [key: string]: unknown;
}

export interface OrderDoc {
  _id: string;
  orderId: string;
  [key: string]: unknown;
}
