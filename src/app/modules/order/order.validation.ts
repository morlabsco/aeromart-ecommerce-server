import { z } from "zod";
import { OrderStatus, PaymentMethod } from "./order.interface";

const orderProductSchema = z.object({
    product: z.string().min(1, "Product ID is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    // The chosen variant's SKU — required by the backend when the product has
    // variants (hasVariants: true). Ignored for non-variant products.
    variant: z
        .object({
            sku: z.string().min(1, "Variant SKU is required"),
        })
        .optional(),
});

const createOrderValidationSchema = z.object({
    body: z.object({
        products: z
            .array(orderProductSchema)
            .min(1, "At least one product is required"),
        coupon: z.string().optional(),
        // The user picks a delivery option NAME (e.g. "Inside Dhaka"); the
        // backend resolves the charge from the store's brand settings.
        deliveryOptionName: z
            .string()
            .min(1, "Delivery option is required"),
        shippingAddress: z
            .string()
            .min(1, "Shipping address is required"),
        recipientName: z
            .string()
            .min(1, "Recipient name is required"),
        phoneNo: z
            .string()
            .min(1, "Phone number is required"),
        notes: z.string().optional(),
        paymentMethod: z.nativeEnum(PaymentMethod, {
            errorMap: () => ({ message: "Invalid payment method" }),
        }),
    }),
});

const updateOrderValidationSchema = z.object({
    body: z.object({
        products: z.array(orderProductSchema).min(1).optional(),
        coupon: z.string().nullable().optional(),
        deliveryOptionName: z.string().min(1).optional(),
        shippingAddress: z.string().min(1).optional(),
        recipientName: z.string().min(1).optional(),
        phoneNo: z.string().min(1).optional(),
        notes: z.string().optional(),
        paymentMethod: z
            .nativeEnum(PaymentMethod, {
                errorMap: () => ({ message: "Invalid payment method" }),
            })
            .optional(),
    }),
});

const updateOrderStatusValidationSchema = z.object({
    body: z.object({
        status: z.nativeEnum(OrderStatus, {
            errorMap: () => ({ message: "Invalid order status" }),
        }),
    }),
});

export const OrderValidation = {
    createOrderValidationSchema,
    updateOrderValidationSchema,
    updateOrderStatusValidationSchema,
};
