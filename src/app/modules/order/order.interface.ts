import { Document, Model, Types } from "mongoose";
import { PaymentProvider } from "../payment/payment.interface";
import { Currency } from "../../constants/currency";

// Order status enum
export enum OrderStatus {
    PENDING = "Pending",
    PROCESSING = "Processing",
    SHIPPED = "Shipped",
    COMPLETED = "Completed",
    CANCELLED = "Cancelled",
}

// Payment method enum
export enum PaymentMethod {
    COD = "COD",
    ONLINE = "Online",
}

// Payment status enum
export enum PaymentStatus {
    PENDING = "Pending",
    PAID = "Paid",
    FAILED = "Failed",
}

// A chosen product variant snapshot — the SKU + attribute combo the customer
// picked. Only present when the product has variants (hasVariants: true).
export interface IOrderProductVariant {
    sku: string;
    attributes: Record<string, string>;
}

// Order product sub-document
export interface IOrderProduct {
    product: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    // The chosen variant when the product has variants (else undefined).
    variant?: IOrderProductVariant;
}

// Order Schema Definition
export interface IOrder extends Document {
    // Human-friendly order reference: "DE07D08M0001U" (U = user, G = guest).
    // Unique, auto-generated at creation.
    orderId: string;
    // Null when the order was placed as a guest (no auth).
    user: Types.ObjectId | null;
    products: IOrderProduct[];
    coupon?: string | null;
    totalAmount: number;
    // Coupon discount only (server-computed).
    discount: number;
    // Discount from active product offerPrice(s) (server-computed).
    offerDiscount: number;
    // Total discount = offerDiscount + discount (coupon). Exposed for display.
    totalDiscount: number;
    // Resolved server-side from the selected delivery option (brand settings).
    deliveryCharge: number;
    // The delivery option NAME the customer picked (e.g. "Inside Dhaka").
    deliveryOptionName?: string;
    finalAmount: number;
    currency: Currency;
    status: OrderStatus;
    shippingAddress: string;
    // Recipient details — required for delivery (can be filled by admin or user).
    recipientName: string;
    phoneNo: string;
    // Optional note attached to the order (filled by admin or user when ordering).
    notes?: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paymentProvider?: PaymentProvider;
    // Payment tracking fields — raw gateway values (provider known via paymentProvider)
    stripeSessionId?: string;
    sslSessionKey?: string;
    transactionId?: string;
    // FX reconciliation — set when a payment is charged in a different currency
    fxRate?: number;
    fxBaseCurrency?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderModel extends Model<IOrder> {
    checkOrderExist(orderId: string): Promise<IOrder>;
}
