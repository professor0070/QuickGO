import * as crypto from "crypto";

/**
 * Verifies the Razorpay payment signature sent after client-side payment completion.
 * Formula: HMAC_SHA256(orderId + "|" + paymentId, secret) === signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generatedSignature === signature;
}

/**
 * Verifies the Razorpay webhook signature sent in the X-Razorpay-Signature header.
 * Formula: HMAC_SHA256(rawBody, secret) === signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return generatedSignature === signature;
}
