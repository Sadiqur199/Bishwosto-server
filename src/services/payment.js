import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Payment gateway abstraction.
 * Currently implements SSLCommerz (sandbox first). aamarPay can be added here
 * behind the same interface without touching controllers.
 *
 * SECURITY: payment success is decided ONLY by verifying the IPN/validation
 * response server-side (signature + amount + transaction id). Never trust the
 * browser redirect.
 */

const SANDBOX_SESSION_URL = 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
const SANDBOX_VALIDATION_URL = 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';
const LIVE_SESSION_URL = 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
const LIVE_VALIDATION_URL = 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

export const isPaymentConfigured = () =>
  Boolean(env.payment.storeId && env.payment.storePassword);

const urls = () =>
  env.payment.sandbox
    ? { session: SANDBOX_SESSION_URL, validate: SANDBOX_VALIDATION_URL }
    : { session: LIVE_SESSION_URL, validate: LIVE_VALIDATION_URL };

/** Create a gateway session and return the redirect URL the browser must follow. */
export async function createGatewaySession({ amount, transactionId, customer, productName, clientUrl }) {
  if (!isPaymentConfigured()) {
    throw ApiError.serviceUnavailable('Payment gateway is not configured on the server.');
  }

  const body = new URLSearchParams({
    store_id: env.payment.storeId,
    store_passwd: env.payment.storePassword,
    total_amount: String(amount),
    currency: 'BDT',
    tran_id: transactionId,
    success_url: `${clientUrl}/payment/success`,
    fail_url: `${clientUrl}/payment/fail`,
    cancel_url: `${clientUrl}/payment/cancel`,
    // Server-to-server IPN (the ONLY source we trust for success).
    ipn_url: `${clientUrl}/api/payments/ipn`,
    cus_name: customer.name || 'GhorKaj User',
    cus_email: customer.email || 'user@ghorkaj.com',
    cus_phone: customer.phone || '01700000000',
    cus_add1: 'N/A',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    shipping_method: 'NO',
    product_name: productName || 'GhorKaj',
    product_category: 'Service',
    product_profile: 'general',
  });

  const res = await fetch(urls().session, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();

  if (data?.status !== 'SUCCESS' || !data?.GatewayPageURL) {
    logger.error('SSLCommerz session failed:', data?.failedreason || data);
    throw ApiError.serviceUnavailable('Could not start the payment session. Please try again.');
  }

  return { gatewayUrl: data.GatewayPageURL, sessionKey: data.sessionkey };
}

/** Verify a transaction with the gateway validation API. */
export async function validateTransaction(valId) {
  if (!isPaymentConfigured()) {
    throw ApiError.serviceUnavailable('Payment gateway is not configured on the server.');
  }

  const params = new URLSearchParams({
    val_id: valId,
    store_id: env.payment.storeId,
    store_passwd: env.payment.storePassword,
    format: 'json',
  });

  const res = await fetch(`${urls().validate}?${params.toString()}`);
  const data = await res.json();
  return data;
}

/** Unique, gateway-safe transaction id (time + random suffix). */
export function makeTransactionId() {
  return `GK${Date.now()}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}
