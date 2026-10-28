// 6-digit OTP — matches the six single-digit slots on the storefront's
// forgot-password step (components/auth/forgot-password/forgot-password.tsx).
export const generateOtp = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();
