import Settings from "../settings/settings.model";
import { SETTINGS_ID } from "../settings/settings.constant";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";
import Product from "../product/product.model";
import Coupon from "../coupon/coupon.model";
import { DiscountType } from "../coupon/coupon.interface";
import { Currency } from "../../constants/currency";
import mongoose from "mongoose";

// Resolves the delivery charge for a selected option name from the store's
// brand settings. The customer never sends an amount — only the option name.
export const resolveDeliveryCharge = async (
    optionName: string,
): Promise<number> => {
    const settings = await Settings.findById(SETTINGS_ID).select("brand");
    const option = settings?.brand?.deliveryOptions?.find(
        (opt: any) => opt.name === optionName && opt.isActive !== false,
    );

    if (!option) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Delivery option "${optionName}" is not available!`,
        );
    }

    return option.charge as number;
};

// Validate products (exist, active, not deleted, sufficient stock) and compute
// the true line totals from the DB prices — client-supplied unitPrice is ignored.
// An ACTIVE offerPrice (within date range, isActive not false) is applied to
// the line price: flat = price - value, percentage = price - (price * value / 100).
// The effective price is never allowed below zero.
//
// Variant-aware: when a product has variants (hasVariants: true), the client
// MUST send the chosen variant's SKU. The unit price and stock are taken from
// that variant (variant.price ?? product.price, variant.stock); the product's
// offerPrice applies on top of the variant price.
export const validateAndPriceProducts = async (
    items: {
        product: mongoose.Types.ObjectId | string;
        quantity: number;
        variant?: { sku: string };
    }[],
) => {
    const priced: {
        product: mongoose.Types.ObjectId;
        quantity: number;
        unitPrice: number;
        variant?: { sku: string; attributes: Record<string, string> };
    }[] = [];

    let total = 0;
    // The savings from ACTIVE offerPrice(s) vs the base product/variant price.
    // This is the "offer discount" shown on the order alongside the coupon.
    let offerDiscount = 0;
    let currency: Currency | null = null;

    for (const item of items) {
        const product = await Product.findOne({
            _id: item.product,
            isDeleted: false,
        });

        if (!product) {
            throw new AppError(
                StatusCodes.NOT_FOUND,
                `Product with ID ${item.product} not found!`,
            );
        }
        if (!product.isActive) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Product "${product.name}" is not available!`,
            );
        }

        const variants = (product.variants as any[]) || [];
        const hasVariants = Boolean(product.hasVariants) && variants.length > 0;

        // Resolve the effective unit price and stock availability.s
        let basePrice = product.price;
        let stock = product.stock;
        let variantSnapshot: { sku: string; attributes: Record<string, string> } | undefined;

        if (hasVariants) {
            if (!item.variant?.sku) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Product "${product.name}" has variants — please select a variant (send variant.sku).`,
                );
            }
            const chosen = variants.find((v: any) => v.sku === item.variant!.sku);
            if (!chosen) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Variant SKU "${item.variant.sku}" not found for product "${product.name}".`,
                );
            }
            if (chosen.isActive === false) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Variant "${chosen.sku}" of product "${product.name}" is not available!`,
                );
            }
            basePrice = typeof chosen.price === "number" ? chosen.price : product.price;
            stock = chosen.stock;
            variantSnapshot = {
                sku: chosen.sku,
                attributes: (chosen.attributes as Record<string, string>) || {},
            };
        } else if (item.variant?.sku) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Product "${product.name}" does not have variants — remove the variant from the order item.`,
            );
        }

        if (stock < item.quantity) {
            const label = hasVariants ? `Variant "${item.variant!.sku}"` : "Product";
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Insufficient stock for "${product.name}"${hasVariants ? ` (variant ${item.variant!.sku})` : ""}. Available: ${stock}`,
            );
        }

        // All products in an order must share the same currency
        if (currency && product.currency !== currency) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "All products in an order must have the same currency!",
            );
        }
        currency = product.currency;

        // Effective unit price — apply the offer when it is currently active.
        let unitPrice = basePrice;
        const offer = product.offerPrice as
            | { type: "flat" | "percentage"; value: number; startAt: Date; endAt: Date; isActive?: boolean }
            | null
            | undefined;
        const now = new Date();
        if (
            offer &&
            offer.isActive !== false &&
            now >= new Date(offer.startAt) &&
            now <= new Date(offer.endAt)
        ) {
            const discount =
                offer.type === "percentage"
                    ? (basePrice * offer.value) / 100
                    : offer.value;
            unitPrice = Math.max(0, basePrice - discount);
            // Savings vs the pre-offer price for THIS line (quantity-scaled).
            offerDiscount += (basePrice - unitPrice) * item.quantity;
        }

        priced.push({
            product: product._id,
            quantity: item.quantity,
            unitPrice,
            ...(variantSnapshot ? { variant: variantSnapshot } : {}),
        });

        total += unitPrice * item.quantity;
    }

    return { priced, totalAmount: total, offerDiscount, currency: currency || Currency.USD };
};

// Verify a coupon code and return the computed discount (0 if no coupon)
export const applyCoupon = async (
    couponCode: string | null | undefined,
    totalAmount: number,
) => {
    if (!couponCode) {
        return { coupon: null, discount: 0 };
    }

    const coupon = await Coupon.findOne({
        code: { $regex: new RegExp(`^${couponCode}$`, "i") },
        isDeleted: { $ne: true },
    });

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found!");
    }
    if (!coupon.isActive) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Coupon is not active!");
    }

    const now = new Date();
    if (now < coupon.startDate) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Coupon is not yet active!",
        );
    }
    if (now > coupon.endDate) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Coupon has expired!");
    }
    if (totalAmount < coupon.minOrderAmount) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
        );
    }

    let discount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
        discount = (totalAmount * coupon.discountValue) / 100;
        if (
            coupon.maxDiscountAmount > 0 &&
            discount > coupon.maxDiscountAmount
        ) {
            discount = coupon.maxDiscountAmount;
        }
    } else {
        discount = coupon.discountValue;
    }

    // Never discount below zero / more than the total
    discount = Math.min(discount, totalAmount);

    return { coupon: coupon.code, discount };
};
