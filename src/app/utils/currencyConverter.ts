import axios from "axios";

// Currencies Stripe supports for payment charges (lowercase).
// BDT is intentionally NOT here — Stripe does not support Bangladeshi Taka.
const STRIPE_SUPPORTED_CURRENCIES = new Set([
    "usd",
    "eur",
    "gbp",
    "inr",
    "aed",
    "aud",
    "cad",
    // Stripe supports many more; add as needed
]);

export const isStripeSupportedCurrency = (currency: string): boolean =>
    STRIPE_SUPPORTED_CURRENCIES.has(currency.toLowerCase());

// Free FX API — no key required. Returns rates relative to USD.
// https://www.exchangerate-api.com/docs/free
export const getFxRate = async (
    fromCurrency: string,
    toCurrency: string,
): Promise<number> => {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) return 1;

    try {
        const { data } = await axios.get(
            `https://open.er-api.com/v6/latest/${from}`,
            { timeout: 8000 },
        );

        if (data?.result !== "success" || !data.rates?.[to]) {
            throw new Error(
                `FX rate not available for ${from} → ${to}`,
            );
        }

        return data.rates[to] as number;
    } catch (error: any) {
        throw new Error(
            `Failed to fetch FX rate (${from} → ${to}): ${error.message}`,
        );
    }
};

// Convert an amount between currencies; rounds to 2 decimals for Stripe minor units
export const convertAmount = async (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
): Promise<{ convertedAmount: number; rate: number }> => {
    const rate = await getFxRate(fromCurrency, toCurrency);
    const convertedAmount = Math.round(amount * rate * 100) / 100;

    return { convertedAmount, rate };
};
