/**
 * Multi-niche seed data generator for the demo e-commerce server.
 *
 * Produces, for each niche, one CSV per collection under:
 *   src/templates/database/collections/<niche>_<collection>.csv
 * e.g. electronics_users.csv, perfume_oil_brands.csv, ...
 *
 * Every _id is a real, freshly generated MongoDB ObjectId (24 hex chars from
 * crypto.randomBytes). Cross-collection references are resolved by in-memory
 * object reference, so ids can never drift out of sync. Settings for each
 * niche come from the project's real presets (settings.presets.ts) so the
 * brand/hero/theme data always matches what the app would seed.
 *
 * Per-niche product data lives in src/templates/database/collections/data/<niche>.ts
 *
 * Run:  npx ts-node src/templates/database/collections/generate-seed.ts
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { settingsPresets } from "../../../app/modules/settings/settings.presets";
import { NicheSeed } from "./data/types";

const OUT_ROOT = path.join(__dirname);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const randomObjectId = () => crypto.randomBytes(12).toString("hex");
const iso = (d: string | Date | number) => new Date(d).toISOString();
const now = () => iso(Date.now());

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/1/0
const randomOrderId = (used: Set<string>) => {
  let s: string;
  do {
    s = "DE";
    for (let i = 0; i < 8; i++) {
      s += ORDER_ALPHABET[crypto.randomInt(ORDER_ALPHABET.length)];
    }
  } while (used.has(s));
  used.add(s);
  return s;
};

const randomTag = (n = 6) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += ORDER_ALPHABET[crypto.randomInt(ORDER_ALPHABET.length)];
  }
  return s;
};

const clean = (s: string) =>
  String(s).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "NA";

// SKU mirrors the server's buildVariantSku: {PREFIX}-{ATTRIBUTES}-{RANDOM}
const buildSku = (prefix: string, attributes: Record<string, string>) => {
  const parts = Object.values(attributes).map(clean);
  return [prefix, ...parts, randomTag(6)].join("-");
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------------------
// CSV writer — RFC 4180 escaping; nested objects/arrays JSON-stringified
// ---------------------------------------------------------------------------
const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const toCsv = (docs: Record<string, unknown>[]) => {
  if (!docs.length) return "";
  const headers = Object.keys(docs[0]);
  const lines = [headers.join(",")];
  for (const doc of docs) {
    lines.push(headers.map((h) => csvCell(doc[h])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SeedContext {
  users: UserDoc[];
  brands: BrandDoc[];
  categories: CategoryDoc[];
  coupons: CouponDoc[];
  products: ProductDoc[];
  reviews: ReviewDoc[];
  orders: OrderDoc[];
  settings: SettingsDoc[];
}

interface UserDoc extends Record<string, unknown> {
  _id: string;
  email: string;
  role: string;
}
interface BrandDoc extends Record<string, unknown> {
  _id: string;
  name: string;
}
interface CategoryDoc extends Record<string, unknown> {
  _id: string;
  name: string;
}
interface CouponDoc extends Record<string, unknown> {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  startDate: string;
  endDate: string;
}
interface ProductDoc extends Record<string, unknown> {
  _id: string;
  name: string;
  slug: string;
  price: number;
  hasVariants: boolean;
  variants: VariantDoc[];
  offerPrice: OfferDoc | null;
  reviews: string[];
  averageRating: number;
  ratingCount: number;
}
interface VariantDoc {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  imageUrls?: unknown[];
  isActive?: boolean;
}
interface OfferDoc {
  type: "flat" | "percentage";
  value: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
}
interface ReviewDoc extends Record<string, unknown> {
  _id: string;
  rating: number;
  user: string;
  product: string;
  description: string;
}
interface OrderDoc extends Record<string, unknown> {
  _id: string;
  orderId: string;
  user: string | null;
  coupon: string | null;
  products: OrderProductDoc[];
  totalAmount: number;
  discount: number;
  offerDiscount: number;
  totalDiscount: number;
  deliveryCharge: number;
  finalAmount: number;
  currency: string;
}
interface OrderProductDoc {
  product: string;
  quantity: number;
  unitPrice: number;
  variant?: { sku: string; attributes: Record<string, string> };
}
interface SettingsDoc extends Record<string, unknown> {
  _id: string;
  brand: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Users (same 10 across niches — separate docs per niche since ids are fresh)
// ---------------------------------------------------------------------------
const buildUsers = (): UserDoc[] => {
  const BCRYPT = "$2b$12$daonVNqLWBwWX.tjLKEJ.eh9/Wb8moJjGmZu2iD47yjveuA6XJMOK";
  const users: UserDoc[] = [
    {
      _id: randomObjectId(),
      email: "admin@demoecommerce.com",
      password: BCRYPT,
      name: "Rafiqul Islam",
      role: "admin",
      phoneNo: "01711000000",
      gender: "Male",
      dateOfBirth: iso("1988-03-15"),
      address: "House 1, Road 1, Gulshan 1",
      city: "Dhaka",
      state: "Dhaka",
      postcode: "1212",
      country: "Bangladesh",
      photoUrl: "",
      clientInfo: {
        device: "pc",
        browser: "Chrome",
        ipAddress: "103.67.156.1",
        pcName: "ADMIN-PC",
        os: "Windows 11",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      lastLogin: iso("2026-08-14T09:00:00Z"),
      isActive: true,
      otpToken: null,
      createdAt: iso("2026-01-05T10:00:00Z"),
      updatedAt: now(),
    },
    {
      _id: randomObjectId(),
      email: "manager@demoecommerce.com",
      password: BCRYPT,
      name: "Sumaiya Akter",
      role: "manager",
      phoneNo: "01712000000",
      gender: "Female",
      dateOfBirth: iso("1992-07-22"),
      address: "House 22, Road 7, Banani",
      city: "Dhaka",
      state: "Dhaka",
      postcode: "1213",
      country: "Bangladesh",
      photoUrl: "",
      clientInfo: {
        device: "pc",
        browser: "Firefox",
        ipAddress: "103.67.156.2",
        pcName: "MANAGER-PC",
        os: "Windows 11",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0)",
      },
      lastLogin: iso("2026-08-13T14:30:00Z"),
      isActive: true,
      otpToken: null,
      createdAt: iso("2026-01-05T10:05:00Z"),
      updatedAt: now(),
    },
  ];

  const customerSeeds: [string, string, string, string, string, string, string, string, string, string, string, string][] = [
    ["Ayesha Rahman", "ayesha.rahman@gmail.com", "Female", "1996-04-12", "01711001101", "House 12, Road 5, Dhanmondi", "Dhaka", "1205", "mobile", "Chrome", "103.67.156.12", "Android 14"],
    ["Tanvir Hasan", "tanvir.hasan@gmail.com", "Male", "1993-11-03", "01822002202", "Flat 3B, Lake View Apartments, Gulshan 2", "Dhaka", "1212", "pc", "Firefox", "203.188.224.9", "Windows 11"],
    ["Nusrat Jahan", "nusrat.jahan@outlook.com", "Female", "1998-07-25", "01633003303", "House 45, Road 11, Banani", "Dhaka", "1213", "mobile", "Safari", "119.30.47.201", "iOS 17"],
    ["Mashrafe Karim", "mashrafe.karim@gmail.com", "Male", "1990-01-18", "01944004404", "House 7, Road 3, Uttara Sector 7", "Dhaka", "1230", "pc", "Chrome", "114.130.24.77", "Windows 10"],
    ["Farhana Mim", "farhana.mim@gmail.com", "Female", "2001-09-08", "01555005505", "House 23, Road 8, Mohammadpur", "Dhaka", "1207", "mobile", "Chrome", "103.154.236.55", "Android 13"],
    ["Shakil Ahmed", "shakil.ahmed@yahoo.com", "Male", "1995-03-29", "01366006606", "House 89, Road 2, Khilgaon", "Dhaka", "1219", "pc", "Edge", "182.160.110.33", "Windows 11"],
    ["Tasnim Chowdhury", "tasnim.chowdhury@gmail.com", "Female", "1997-12-02", "01777007707", "House 15, Road 9, Mirpur DOHS", "Dhaka", "1216", "mobile", "Safari", "103.61.12.199", "iOS 16"],
    ["Imran Hossain", "imran.hossain@gmail.com", "Male", "1992-06-14", "01888008808", "House 34, Road 12, Rampura", "Dhaka", "1219", "pc", "Chrome", "123.49.50.164", "Windows 11"],
  ];

  customerSeeds.forEach((s, i) => {
    users.push({
      _id: randomObjectId(),
      email: s[1],
      password: BCRYPT,
      name: s[0],
      role: "customer",
      phoneNo: s[4],
      gender: s[2],
      dateOfBirth: iso(s[3]),
      address: s[5],
      city: s[6],
      state: s[6],
      postcode: s[7],
      country: "Bangladesh",
      photoUrl: "",
      clientInfo: {
        device: s[8],
        browser: s[9],
        ipAddress: s[10],
        pcName: s[8] === "pc" ? `USER${i + 1}-PC` : "",
        os: s[11],
        userAgent: "Mozilla/5.0",
      },
      lastLogin: iso(`2026-08-${String(14 - i).padStart(2, "0")}T10:00:00Z`),
      isActive: true,
      otpToken: null,
      createdAt: iso(`2026-02-${String(i + 1).padStart(2, "0")}T09:00:00Z`),
      updatedAt: now(),
    });
  });

  return users;
};

// ---------------------------------------------------------------------------
// Brands / Categories / Coupons
// ---------------------------------------------------------------------------
const buildBrands = (names: [string, string][], createdBy: string): BrandDoc[] =>
  names.map(([name, description]) => ({
    _id: randomObjectId(),
    name,
    description,
    logo: "",
    isActive: true,
    isDeleted: false,
    createdBy,
    createdAt: iso("2026-01-10T10:00:00Z"),
    updatedAt: now(),
  }));

const buildCategories = (
  names: [string, string, string][],
  createdBy: string,
): CategoryDoc[] =>
  names.map(([name, slug, icon]) => ({
    _id: randomObjectId(),
    name,
    slug,
    description: `${name} collection.`,
    parent: null,
    isActive: true,
    isDeleted: false,
    createdBy,
    icon,
    createdAt: iso("2026-01-10T10:00:00Z"),
    updatedAt: now(),
  }));

const buildCoupons = (): CouponDoc[] => {
  const seeds: [string, string, number, number, number, string, string][] = [
    ["EID20", "percentage", 20, 5000, 2000, "2026-08-01", "2026-09-15"],
    ["WELCOME10", "percentage", 10, 3000, 1000, "2026-01-01", "2026-12-31"],
    ["FLAT500", "fixed", 500, 4000, 0, "2026-07-01", "2026-10-31"],
    ["SAVE15", "percentage", 15, 8000, 2500, "2026-06-01", "2026-12-31"],
    ["TECH5", "percentage", 5, 1000, 300, "2026-08-01", "2026-09-30"],
  ];
  return seeds.map(([code, discountType, discountValue, minOrderAmount, maxDiscountAmount, start, end]) => ({
    _id: randomObjectId(),
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    startDate: iso(`${start}T00:00:00Z`),
    endDate: iso(`${end}T23:59:59Z`),
    isActive: true,
    isDeleted: false,
    createdAt: iso("2026-07-01T10:00:00Z"),
    updatedAt: now(),
  }));
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
interface ProductSeed {
  name: string;
  price: number;
  stock?: number;
  weight: number;
  category: string;
  brand: string;
  spec: [string, string][];
  features: string[];
  description?: string;
  offerPrice?: { type: "flat" | "percentage"; value: number; startAt: string; endAt: string };
  colors?: { name: string; hex: string }[];
  attributes?: { key: string; values: string[] }[];
  variants?: { attributes: Record<string, string>; price: number; stock: number }[];
}

const buildProducts = (
  seeds: ProductSeed[],
  ctx: {
    brandByName: Map<string, string>;
    categoryByName: Map<string, string>;
    createdBy: string;
  },
): ProductDoc[] => {
  return seeds.map((seed, i) => {
    const hasVariants = Array.isArray(seed.variants) && seed.variants.length > 0;
    const slug = slugify(seed.name);
    const prefix = slug.replace(/-/g, "").slice(0, 8).toUpperCase();

    const variants: VariantDoc[] = hasVariants
      ? seed.variants!.map((v) => {
          const sku = buildSku(prefix, v.attributes);
          return {
            sku,
            attributes: v.attributes,
            price: v.price,
            stock: v.stock,
            imageUrls: [],
            isActive: true,
          };
        })
      : [];

    return {
      _id: randomObjectId(),
      name: seed.name,
      slug,
      description: seed.description || seed.features.join(". ") + ".",
      price: seed.price,
      currency: "bdt",
      stock: hasVariants ? 0 : seed.stock ?? 10,
      weight: seed.weight,
      category: ctx.categoryByName.get(seed.category)!,
      imageUrls: [],
      isActive: true,
      isDeleted: false,
      brand: ctx.brandByName.get(seed.brand)!,
      createdBy: ctx.createdBy,
      reviews: [],
      averageRating: 0,
      ratingCount: 0,
      specification: seed.spec.map(([key, value]) => ({ key, value })),
      keyFeatures: seed.features,
      offerPrice: seed.offerPrice
        ? {
            ...seed.offerPrice,
            startAt: iso(`${seed.offerPrice.startAt}T00:00:00Z`),
            endAt: iso(`${seed.offerPrice.endAt}T23:59:59Z`),
            isActive: true,
          }
        : null,
      colorOptions: seed.colors || [],
      attributes: seed.attributes || [],
      variants,
      hasVariants,
      createdAt: iso(`2026-0${Math.min(3, 1 + Math.floor(i / 7))}-1${i % 7}T10:00:00Z`),
      updatedAt: now(),
    };
  });
};

// ---------------------------------------------------------------------------
// Reviews (15 reviewed products, max 10 each; 5 products with none)
// ---------------------------------------------------------------------------
const reviewTexts: Record<number, string[]> = {
  5: [
    "Absolutely love it! Exceeded all my expectations. Worth every taka.",
    "Flawless experience from order to delivery. Highly recommended.",
    "Best purchase I've made this year. The performance is outstanding.",
    "Perfect in every way. Build quality is top notch.",
    "Amazing product, exactly as described. Five stars!",
    "Superb quality and lightning fast delivery. Very happy!",
    "This is my second order from this store. Never disappoints.",
    "Outstanding value for money. Genuinely impressed.",
  ],
  4: [
    "Great product overall. A couple of minor things but very good value.",
    "Very good quality, works exactly as expected. Would buy again.",
    "Solid performance and great battery life. Recommended.",
    "Really good device for the price. Happy with the purchase.",
    "Nice product, matches the description. Delivery was quick too.",
  ],
  3: [
    "It's okay. Decent for the price but nothing exceptional.",
    "Average experience. Some features are nice, others fall short.",
    "Good product but the packaging could be better.",
  ],
  2: [
    "Not quite what I expected. A few issues with the battery.",
    "Disappointed with the performance. Would not recommend for heavy use.",
  ],
  1: [
    "Very poor experience. The device stopped working after a week.",
    "Bad quality, not worth the money. Regret this purchase.",
  ],
};

// Build reviews for the FIRST `reviewed` products (by array order), leaving the
// rest unreviewed. Products must be ordered so the first 15 are the "popular"
// ones and the last 5 have no reviews.
const buildReviews = (
  products: ProductDoc[],
  customers: UserDoc[],
): ReviewDoc[] => {
  const reviewed = products.slice(0, 15);
  const reviews: ReviewDoc[] = [];
  const usedUserProduct = new Set<string>();
  let reviewCounter = 1;

  reviewed.forEach((product, idx) => {
    // 1..8 reviews per product — never more than the 8 customers available,
    // and each (user, product) pair must be unique.
    const count = 1 + ((idx * 3) % 8);
    for (let i = 0; i < count; i++) {
      let userIdx = (i + idx) % customers.length;
      let guard = 0;
      while (
        usedUserProduct.has(`${customers[userIdx]._id}:${product._id}`) &&
        guard < customers.length
      ) {
        userIdx = (userIdx + 1) % customers.length;
        guard++;
      }
      if (guard >= customers.length) continue;
      usedUserProduct.add(`${customers[userIdx]._id}:${product._id}`);

      // Realistic mix: mostly 4-5 stars, a few 3s, rare 2-1
      const roll = (idx + i) % 10;
      const rating = roll < 5 ? 5 : roll < 8 ? 4 : roll < 9 ? 3 : 2;
      const pool = reviewTexts[rating] || reviewTexts[4];
      reviews.push({
        _id: randomObjectId(),
        rating,
        description: pool[i % pool.length],
        user: customers[userIdx]._id,
        product: product._id,
        isFlagged: false,
        flaggedReason: "",
        isVerifiedPurchase: rating >= 4 || i % 3 !== 0,
        createdAt: iso(`2026-0${5 + (idx % 3)}-${String(10 + i).padStart(2, "0")}T12:00:00Z`),
        updatedAt: now(),
      });
    }
    reviewCounter += count;
  });

  // roll stats up
  reviews.forEach((r) => {
    const p = products.find((x) => x._id === r.product)!;
    p.reviews.push(r._id);
  });
  products.forEach((p) => {
    if (p.reviews.length > 0) {
      const sum = p.reviews.reduce(
        (acc, rid) => acc + reviews.find((r) => r._id === rid)!.rating,
        0,
      );
      p.ratingCount = p.reviews.length;
      p.averageRating = Math.round((sum / p.reviews.length) * 10) / 10;
    }
  });

  return reviews;
};

// ---------------------------------------------------------------------------
// Orders (10 per niche; mix of variant/non-variant, COD/online, paid/pending)
// ---------------------------------------------------------------------------
const deliveryOptions = [
  { name: "Store Pickup", charge: 0 },
  { name: "Inside Dhaka", charge: 90 },
  { name: "Outside Dhaka", charge: 150 },
];
const deliveryCharge = (name: string) =>
  deliveryOptions.find((d) => d.name === name)!.charge;

const offerIsActive = (offer: OfferDoc | null) =>
  offer &&
  offer.isActive !== false &&
  new Date(offer.startAt) <= new Date() &&
  new Date(offer.endAt) >= new Date();

interface OrderSeed {
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

const buildOrders = (
  orderSeeds: OrderSeed[],
  couponByCode: Map<string, CouponDoc>,
): OrderDoc[] => {
  const usedOrderIds = new Set<string>();

  const priceOrder = (seed: OrderSeed) => {
    const productsOut = seed.items.map(({ product, quantity = 1, variantIndex = 0 }) => {
      const hasVariants = product.hasVariants && product.variants.length > 0;
      const basePrice = hasVariants
        ? product.variants[variantIndex].price ?? product.price
        : product.price;

      let unitPrice = basePrice;
      let offerDiscount = 0;
      const offer = offerIsActive(product.offerPrice as OfferDoc | null)
        ? (product.offerPrice as OfferDoc)
        : null;
      if (offer) {
        const perUnit =
          offer.type === "percentage"
            ? Math.round((basePrice * offer.value) / 100)
            : offer.value;
        unitPrice = Math.max(0, basePrice - perUnit);
        offerDiscount = perUnit * quantity;
      }

      return {
        product: product._id,
        quantity,
        unitPrice,
        ...(hasVariants
          ? {
              variant: {
                sku: product.variants[variantIndex].sku,
                attributes: product.variants[variantIndex].attributes,
              },
            }
          : {}),
        offerDiscount,
      };
    });

    const totalAmount = productsOut.reduce(
      (acc, p) => acc + p.unitPrice * p.quantity,
      0,
    );
    const offerDiscount = productsOut.reduce((acc, p) => acc + p.offerDiscount, 0);

    let discount = 0;
    if (seed.coupon) {
      const c = couponByCode.get(seed.coupon)!;
      discount =
        c.discountType === "percentage"
          ? Math.round((totalAmount * c.discountValue) / 100)
          : c.discountValue;
      if (c.maxDiscountAmount > 0 && discount > c.maxDiscountAmount) {
        discount = c.maxDiscountAmount;
      }
      discount = Math.min(discount, totalAmount);
    }

    const charge = deliveryCharge(seed.delivery);
    return {
      products: productsOut.map(({ offerDiscount: _od, ...rest }) => rest),
      totalAmount,
      discount,
      offerDiscount,
      totalDiscount: offerDiscount + discount,
      deliveryCharge: charge,
      finalAmount: totalAmount - discount - offerDiscount + charge,
    };
  };

  return orderSeeds.map((seed) => {
    const pricing = priceOrder(seed);
    return {
      _id: randomObjectId(),
      orderId: randomOrderId(usedOrderIds),
      user: seed.user ? seed.user._id : null,
      products: pricing.products,
      coupon: seed.coupon || null,
      totalAmount: pricing.totalAmount,
      discount: pricing.discount,
      offerDiscount: pricing.offerDiscount,
      totalDiscount: pricing.totalDiscount,
      deliveryCharge: pricing.deliveryCharge,
      deliveryOptionName: seed.delivery,
      finalAmount: pricing.finalAmount,
      currency: "bdt",
      status: seed.status,
      shippingAddress: seed.address,
      recipientName: seed.recipient,
      phoneNo: seed.phone,
      notes: seed.notes,
      paymentMethod: seed.paymentMethod,
      paymentStatus: seed.paymentStatus,
      paymentProvider: seed.provider,
      stripeSessionId: seed.stripeSessionId || null,
      sslSessionKey: seed.sslSessionKey || null,
      transactionId: seed.transactionId || null,
      fxRate: seed.fxRate || null,
      fxBaseCurrency: seed.fxBaseCurrency || null,
      createdAt: iso(seed.createdAt),
      updatedAt: now(),
    };
  });
};

// ---------------------------------------------------------------------------
// Settings — pulled straight from the app's own presets (single source of truth)
// ---------------------------------------------------------------------------
const buildSettings = (niche: string): SettingsDoc[] => {
  const preset = settingsPresets[niche];
  if (!preset) throw new Error(`No settings preset for niche "${niche}"`);
  return [
    {
      _id: "singleton",
      brand: {
        ...preset.brand,
        currency: "bdt",
        deliveryOptions: preset.brand.deliveryOptions,
      },
      theme: preset.theme,
      hero: preset.hero,
      testimonials: preset.testimonials,
      navbar: preset.navbar,
      footer: preset.footer,
      contact: preset.contact,
      about: preset.about,
      limitedOffer: preset.limitedOffer,
      createdAt: iso("2026-01-01T00:00:00Z"),
      updatedAt: now(),
    },
  ];
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
const buildNiche = (niche: NicheSeed): SeedContext => {
  const users = buildUsers();
  const admin = users[0];
  const customers = users.slice(2);

  const brands = buildBrands(niche.brands, admin._id);
  const categories = buildCategories(niche.categories, admin._id);
  const coupons = buildCoupons();

  const brandByName = new Map(brands.map((b) => [b.name, b._id]));
  const categoryByName = new Map(categories.map((c) => [c.name, c._id]));

  const products = buildProducts(niche.products, {
    brandByName,
    categoryByName,
    createdBy: admin._id,
  });

  const reviews = buildReviews(products, customers);

  const couponByCode = new Map(coupons.map((c) => [c.code, c]));
  const byName = Object.fromEntries(products.map((p) => [p.name, p]));
  const orders = buildOrders(niche.orders(byName, customers), couponByCode);

  const settings = buildSettings(niche.key);

  return { users, brands, categories, coupons, products, reviews, orders, settings };
};

// ---------------------------------------------------------------------------
// Validation (in-memory, before writing)
// ---------------------------------------------------------------------------
const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error("VALIDATION FAILED: " + msg);
};
const isObjectId = (s: unknown) => typeof s === "string" && /^[0-9a-f]{24}$/.test(s);

const validate = (niche: string, ctx: SeedContext) => {
  const { users, brands, categories, coupons, products, reviews, orders, settings } = ctx;
  const tag = `[${niche}]`;
  const couponByCode = new Map(coupons.map((c) => [c.code, c]));

  const allIds = [
    ...users, ...brands, ...categories, ...coupons, ...products, ...reviews, ...orders,
  ].map((d: { _id: string }) => d._id);
  assert(new Set(allIds).size === allIds.length, `${tag} duplicate _id`);
  allIds.forEach((id) => assert(isObjectId(id), `${tag} non-ObjectId _id`));

  const userSet = new Set(users.map((u) => u._id));
  const brandSet = new Set(brands.map((b) => b._id));
  const catSet = new Set(categories.map((c) => c._id));
  const productSet = new Set(products.map((p) => p._id));

  brands.forEach((b) => assert(userSet.has(b.createdBy as string), `${tag} brand createdBy`));
  categories.forEach((c) => assert(userSet.has(c.createdBy as string), `${tag} category createdBy`));

  products.forEach((p) => {
    assert(brandSet.has(p.brand as string), `${tag} product brand ${p.name}`);
    assert(catSet.has(p.category as string), `${tag} product category ${p.name}`);
    assert(userSet.has(p.createdBy as string), `${tag} product createdBy ${p.name}`);
    assert(p.currency === "bdt", `${tag} product currency ${p.name}`);
    if (p.hasVariants) {
      assert(p.variants.length >= 1 && p.variants.length <= 5, `${tag} ${p.name} variant count`);
      assert(p.stock === 0, `${tag} ${p.name} variant base stock`);
    } else {
      assert(p.variants.length === 0, `${tag} ${p.name} non-variant has variants`);
      assert(Number(p.stock) > 0, `${tag} ${p.name} base stock`);
    }
  });

  const skuSet = new Set<string>();
  products.forEach((p) =>
    p.variants.forEach((v) => {
      assert(!skuSet.has(v.sku), `${tag} duplicate SKU ${v.sku}`);
      skuSet.add(v.sku);
    }),
  );

  assert(new Set(coupons.map((c) => c.code)).size === coupons.length, `${tag} duplicate coupon`);

  reviews.forEach((r) => {
    assert(userSet.has(r.user), `${tag} review user`);
    assert(productSet.has(r.product), `${tag} review product`);
    assert(r.rating >= 1 && r.rating <= 5, `${tag} review rating`);
  });
  assert(
    new Set(reviews.map((r) => `${r.user}:${r.product}`)).size === reviews.length,
    `${tag} duplicate review (user, product)`,
  );

  const productById = new Map(products.map((p) => [p._id, p]));
  const reviewById = new Map(reviews.map((r) => [r._id, r]));
  products.forEach((p) => {
    p.reviews.forEach((rid) => {
      const r = reviewById.get(rid);
      assert(Boolean(r && r.product === p._id), `${tag} ${p.name} reviews mismatch`);
    });
    if (p.reviews.length > 0) {
      assert(p.ratingCount === p.reviews.length, `${tag} ratingCount ${p.name}`);
      const avg =
        Math.round(
          (p.reviews.reduce((a, rid) => a + reviewById.get(rid)!.rating, 0) /
            p.reviews.length) *
            10,
        ) / 10;
      assert(p.averageRating === avg, `${tag} averageRating ${p.name}`);
    }
  });

  orders.forEach((o) => {
    assert(o.user === null || userSet.has(o.user), `${tag} order user ${o.orderId}`);
    if (o.coupon) assert(couponByCode.has(o.coupon), `${tag} order coupon ${o.orderId}`);
    assert(o.products.length > 0, `${tag} order products ${o.orderId}`);
    o.products.forEach((item) => {
      const p = productById.get(item.product);
      assert(Boolean(p), `${tag} order product ref ${o.orderId}`);
      const prod = p!;
      assert(item.unitPrice > 0 && item.unitPrice <= Number(prod.price), `${tag} order unitPrice ${o.orderId}`);
      if (prod.hasVariants) {
        assert(Boolean(item.variant && item.variant.sku), `${tag} order variant required ${o.orderId}`);
        assert(prod.variants.some((v) => v.sku === item.variant!.sku), `${tag} order variant sku ${o.orderId}`);
      } else {
        assert(!item.variant, `${tag} order variant on non-variant ${o.orderId}`);
      }
    });
    const calc = o.totalAmount - o.discount - o.offerDiscount + o.deliveryCharge;
    assert(o.finalAmount === calc, `${tag} order finalAmount ${o.orderId}`);
    assert(o.totalDiscount === o.discount + o.offerDiscount, `${tag} order totalDiscount ${o.orderId}`);
    assert(o.currency === "bdt", `${tag} order currency ${o.orderId}`);
  });

  assert(settings.length === 1 && settings[0]._id === "singleton", `${tag} settings id`);
  assert(settings[0].brand.currency === "bdt", `${tag} settings currency`);

  const reviewed = products.filter((p) => p.reviews.length > 0).length;
  const none = products.filter((p) => p.reviews.length === 0).length;
  assert(products.length === 20, `${tag} expected 20 products, got ${products.length}`);
  const variantProds = products.filter((p) => p.hasVariants).length;
  const nonVariantProds = products.filter((p) => !p.hasVariants).length;
  assert(variantProds === 15, `${tag} expected 15 variant products, got ${variantProds}`);
  assert(nonVariantProds === 5, `${tag} expected 5 non-variant products, got ${nonVariantProds}`);
  assert(reviewed === 15, `${tag} expected 15 reviewed, got ${reviewed}`);
  assert(none === 5, `${tag} expected 5 unreviewed, got ${none}`);
  assert(reviews.every((r) => r.user !== users[0]._id && r.user !== users[1]._id), `${tag} reviews must come from customers`);
  assert(users.filter((u) => u.role === "admin").length === 1, `${tag} 1 admin`);
  assert(users.filter((u) => u.role === "manager").length === 1, `${tag} 1 manager`);
  assert(users.filter((u) => u.role === "customer").length === 8, `${tag} 8 customers`);
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
const writeNiche = (niche: NicheSeed) => {
  const ctx = buildNiche(niche);
  validate(niche.key, ctx);
  const prefix = niche.filePrefix;

  // Each niche gets its own folder: collections/<niche>/<niche>_<collection>.csv
  const nicheDir = path.join(OUT_ROOT, prefix);
  fs.mkdirSync(nicheDir, { recursive: true });

  const files: [string, Record<string, unknown>[]][] = [
    [`${prefix}_users`, ctx.users],
    [`${prefix}_brands`, ctx.brands],
    [`${prefix}_categories`, ctx.categories],
    [`${prefix}_coupons`, ctx.coupons],
    [`${prefix}_products`, ctx.products],
    [`${prefix}_reviews`, ctx.reviews],
    [`${prefix}_orders`, ctx.orders],
    [`${prefix}_settings`, ctx.settings],
  ];

  for (const [name, docs] of files) {
    fs.writeFileSync(path.join(nicheDir, `${name}.csv`), toCsv(docs), "utf8");
  }
  console.log(`  ${prefix}: users=${ctx.users.length} brands=${ctx.brands.length} categories=${ctx.categories.length} coupons=${ctx.coupons.length} products=${ctx.products.length} reviews=${ctx.reviews.length} orders=${ctx.orders.length} settings=${ctx.settings.length}`);
};

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
import { NICHES } from "./data/index";

const main = () => {
  console.log("Generating seed data...");
  for (const niche of NICHES) {
    writeNiche(niche);
  }
  console.log("Done. Output:", OUT_ROOT);
};

main();
