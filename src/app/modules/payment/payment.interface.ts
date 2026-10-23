import { Types } from "mongoose";

export enum PaymentProvider {
    STRIPE = "stripe",
    SSLCOMMERZ = "sslcommerz",
    BKASH = "bkash",
}

export enum PaymentGatewayStatus {
    SUCCESS = "success",
    FAILED = "failed",
    PENDING = "pending",
    CANCELLED = "cancelled",
}

export interface IStripeInitData {
    amount: number;
    currency: string;
    orderId: string;
    productName: string;
}

export interface ISSLCommerzInitData {
    total_amount: number;
    currency: string;
    tran_id: string;
    success_url: string;
    fail_url: string;
    cancel_url: string;
    ipn_url: string;
    product_name: string;
    product_category: string;
    cus_name: string;
    cus_email: string;
    cus_phone: string;
    cus_add1: string;
    cus_add2: string;
    cus_city: string;
    cus_state: string;
    cus_postcode: string;
    cus_country: string;
    ship_name: string;
    ship_add1: string;
    ship_add2: string;
    ship_city: string;
    ship_state: string;
    ship_postcode: string | number;
    ship_country: string;
}

export interface IbKashInitData {
    amount: number;
    orderId: string;
    customerNumber: string;
    customerName: string;
    reference: string;
}

export interface IPaymentResponse {
    success: boolean;
    gatewayUrl?: string;
    sessionId?: string;
    paymentIntentId?: string;
    clientSecret?: string;
    publishableKey?: string;
    redirectUrl?: string;
    transactionId?: string;
    status?: PaymentGatewayStatus;
    message: string;
}

export interface IPaymentValidationData {
    transactionId: string;
    orderId: string;
    provider: PaymentProvider;
    amount: number;
    status: PaymentGatewayStatus;
}
