import mongoose, { Schema } from "mongoose";
import {
    IOrder,
    OrderModel,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from "./order.interface";
import { PaymentProvider } from "../payment/payment.interface";
import { Currency } from "../../constants/currency";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

const orderProductVariantSchema = new Schema(
    {
        sku: { type: String, required: true, trim: true },
        attributes: { type: Map, of: String, default: {} },
    },
    { _id: false },
);

const orderProductSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        // Snapshot of the chosen variant (SKU + attributes) when the product
        // has variants. Priced/stocked from the variant, not the base product.
        variant: {
            type: orderProductVariantSchema,
            default: undefined,
        },
    },
    { _id: false },
);

const orderSchema = new Schema<IOrder, OrderModel>(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        products: {
            type: [orderProductSchema],
            required: true,
            validate: {
                validator: (items: unknown[]) => items.length > 0,
                message: "At least one product is required",
            },
        },
        coupon: {
            type: String,
            default: null,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Discount from active product offerPrice(s) — tracked separately so
        // the order can show offer savings and coupon savings independently.
        offerDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Combined discount = offerDiscount + discount (coupon).
        totalDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },
        deliveryCharge: {
            type: Number,
            default: 0,
            min: 0,
        },
        deliveryOptionName: {
            type: String,
            default: "",
            trim: true,
        },
        finalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: Object.values(Currency),
            default: Currency.USD,
        },
        status: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
        },
        shippingAddress: {
            type: String,
            required: true,
        },
        recipientName: {
            type: String,
            required: true,
            trim: true,
        },
        phoneNo: {
            type: String,
            required: true,
            trim: true,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
        },
        paymentProvider: {
            type: String,
            enum: Object.values(PaymentProvider),
            default: null,
        },
        stripeSessionId: {
            type: String,
            default: null,
        },
        sslSessionKey: {
            type: String,
            default: null,
        },
        transactionId: {
            type: String,
            default: null,
        },
        fxRate: {
            type: Number,
            default: null,
        },
        fxBaseCurrency: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { __v, ...rest } = ret;
                return rest;
            },
        },
    },
);

orderSchema.statics.checkOrderExist = async function (orderId: string) {
    const existingOrder = await this.findById(orderId);

    if (!existingOrder) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order does not exist!");
    }

    return existingOrder;
};

const Order = mongoose.model<IOrder, OrderModel>("Order", orderSchema);

export default Order;
