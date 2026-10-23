import crypto from "crypto";
import Order from "../modules/order/order.model";

/**
 * Generates a human-friendly, UNGUESSABLE order id in the format:
 *   DEXXXXXXXX  (DE + 8 random chars, e.g. "DEY2H7ULPD" → 10 chars total)
 *
 * The 8-char suffix is cryptographically random (alphanumeric, uppercase),
 * with NO date or sequence encoded — a predictable incrementing sequence would
 * let users guess other order ids and scrape data. The unique index on
 * `orderId` guards against the astronomically unlikely collision; a retry loop
 * re-rolls if one ever occurs.
 */
export const generateOrderId = async (): Promise<string> => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/1/0 — avoids look-alike confusion

    for (let attempt = 0; attempt < 5; attempt++) {
        const bytes = crypto.randomBytes(8);
        let suffix = "";
        for (let i = 0; i < bytes.length; i++) {
            suffix += alphabet[bytes[i] % alphabet.length];
        }

        const candidate = `DE${suffix}`;
        const exists = await Order.findOne({ orderId: candidate }).select("_id");
        if (!exists) {
            return candidate;
        }
    }

    // Extremely unlikely — final fallback with the full byte range.
    const fallback = crypto
        .randomBytes(8)
        .toString("base64")
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
    return `DE${fallback}`;
};
