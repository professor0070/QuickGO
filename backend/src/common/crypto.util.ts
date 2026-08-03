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

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypts sensitive string data at rest using AES-256-GCM.
 * Hex key must be exactly 64 hex characters (32 bytes).
 * Prefixes the output payload with "v1:" for versioning/key-rotation safety.
 */
export function encryptAtRest(text: string, hexKey: string | undefined): string {
  if (!hexKey || hexKey.trim().length === 0) {
    throw new Error("ENCRYPTION_KEY_NOT_CONFIGURED: Encryption key is missing.");
  }
  if (hexKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY_INVALID: Key must be exactly 64 hex characters (32 bytes).");
  }
  const key = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts sensitive string data at rest using AES-256-GCM.
 * Supports legacy non-prefixed format (3-part colon strings) and versioned (v1:) payloads.
 */
export function decryptAtRest(cipherText: string, hexKey: string | undefined): string {
  if (!hexKey || hexKey.trim().length === 0) {
    throw new Error("ENCRYPTION_KEY_NOT_CONFIGURED: Decryption key is missing.");
  }
  if (hexKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY_INVALID: Key must be exactly 64 hex characters (32 bytes).");
  }

  const parts = cipherText.split(":");
  let ivHex: string;
  let tagHex: string;
  let encHex: string;

  if (parts.length === 4 && parts[0] === "v1") {
    ivHex = parts[1];
    tagHex = parts[2];
    encHex = parts[3];
  } else if (parts.length === 3) {
    // Legacy v0 fallback
    ivHex = parts[0];
    tagHex = parts[1];
    encHex = parts[2];
  } else if (parts.length === 4 && parts[0] !== "v1") {
    throw new Error(`DECRYPTION_FAILED: Unsupported payload version: ${parts[0]}`);
  } else {
    throw new Error("DECRYPTION_FAILED: Invalid ciphertext format.");
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const key = Buffer.from(hexKey, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (error: any) {
    throw new Error(`DECRYPTION_FAILED: ${error.message}`);
  }
}
