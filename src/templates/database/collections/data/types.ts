import { ProductDoc, UserDoc, OrderDoc } from "./seed-types";

/**
 * Per-niche seed data contract. Each niche defines its own brands, categories,
 * 20 products (15 with reviews + 5 without), and 10 orders. The shared engine
 * (generate-seed.ts) turns these into full collection CSVs.
 */
export interface ProductSeed {
  name: string;
  price: number;
  stock?: number;
  weight: number;
  category: string;
  brand: string;
  spec: [string, string][];
  features: string[];
  description?: string;
  offerPrice?: {
    type: "flat" | "percentage";
    value: number;
    startAt: string; // "2026-08-01"
    endAt: string; // "2026-08-31"
  };
  colors?: { name: string; hex: string }[];
  attributes?: { key: string; values: string[] }[];
  variants?: {
    attributes: Record<string, string>;
    price: number;
    stock: number;
  }[];
}

export interface SeedOrderSeed {
  user: UserDoc | null;
  items: { product: ProductDoc; variantIndex?: number; quantity?: number }[];
  coupon: string | null;
  delivery: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  provider: string | null;
  transactionId?: string;
  sslSessionKey?: string;
  stripeSessionId?: string;
  fxRate?: number;
  fxBaseCurrency?: string;
  address: string;
  recipient: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface NicheSeed {
  key: string; // settings preset key e.g. "electronics"
  filePrefix: string; // CSV prefix e.g. "electronics" or "perfume_oil"
  label: string;
  brands: [string, string][]; // [name, description]
  categories: [string, string, string][]; // [name, slug, icon]
  products: ProductSeed[]; // exactly 20; first 15 get reviews
  orders: (
    byName: Record<string, ProductDoc>,
    customers: UserDoc[],
  ) => SeedOrderSeed[];
}

export type { ProductDoc, UserDoc, OrderDoc };
