import { encryptAtRest, decryptAtRest, verifyRazorpaySignature } from "./crypto.util";

describe("crypto.util", () => {
  describe("Razorpay Signature Verification", () => {
    it("should return false if any parameter is missing", () => {
      expect(verifyRazorpaySignature("", "pay_123", "sig_123", "secret")).toBe(false);
      expect(verifyRazorpaySignature("order_123", "", "sig_123", "secret")).toBe(false);
      expect(verifyRazorpaySignature("order_123", "pay_123", "", "secret")).toBe(false);
      expect(verifyRazorpaySignature("order_123", "pay_123", "sig_123", "")).toBe(false);
    });

    it("should verify signature correctly", () => {
      const orderId = "order_123";
      const paymentId = "pay_123";
      const secret = "secret_key";

      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
    });
  });

  describe("AES-256-GCM Encryption at Rest", () => {
    const validHexKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 chars = 32 bytes
    const otherHexKey = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    // 1. encrypt → decrypt returns the original value
    it("should encrypt and decrypt correctly with a valid key", () => {
      const plaintext = "my-secret-bank-account-number";
      const ciphertext = encryptAtRest(plaintext, validHexKey);

      expect(ciphertext).toBeDefined();
      expect(ciphertext.startsWith("v1:")).toBe(true);
      expect(ciphertext.split(":").length).toBe(4); // v1:iv:tag:encrypted

      const decrypted = decryptAtRest(ciphertext, validHexKey);
      expect(decrypted).toBe(plaintext);
    });

    // 2. encrypting identical plaintext twice produces different ciphertext
    it("should produce non-deterministic ciphertext due to random unique IVs", () => {
      const plaintext = "identical-plaintext";
      const cipher1 = encryptAtRest(plaintext, validHexKey);
      const cipher2 = encryptAtRest(plaintext, validHexKey);

      expect(cipher1).not.toBe(cipher2);
    });

    // 3. modified ciphertext fails
    it("should fail decryption if the ciphertext data is tampered", () => {
      const plaintext = "sensitive-information";
      const ciphertext = encryptAtRest(plaintext, validHexKey);
      const parts = ciphertext.split(":");

      // Corrupt the encrypted hex string by replacing the last character
      const encHex = parts[3];
      const corruptedEncHex = encHex.slice(0, -1) + (encHex.endsWith("0") ? "1" : "0");
      const corruptedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:${corruptedEncHex}`;

      expect(() => decryptAtRest(corruptedCiphertext, validHexKey)).toThrow();
    });

    // 4. modified authentication tag fails
    it("should fail decryption if the authentication tag is tampered", () => {
      const plaintext = "sensitive-information";
      const ciphertext = encryptAtRest(plaintext, validHexKey);
      const parts = ciphertext.split(":");

      // Corrupt the tag segment
      const tagHex = parts[2];
      const corruptedTagHex = tagHex.slice(0, -1) + (tagHex.endsWith("0") ? "1" : "0");
      const corruptedCiphertext = `${parts[0]}:${parts[1]}:${corruptedTagHex}:${parts[3]}`;

      expect(() => decryptAtRest(corruptedCiphertext, validHexKey)).toThrow();
    });

    // 5. wrong key fails
    it("should fail decryption if a different valid 32-byte key is used", () => {
      const plaintext = "sensitive-information";
      const ciphertext = encryptAtRest(plaintext, validHexKey);

      expect(() => decryptAtRest(ciphertext, otherHexKey)).toThrow();
    });

    // 6. missing key fails
    it("should throw an error if key is not configured (empty or undefined)", () => {
      expect(() => encryptAtRest("data", undefined)).toThrow("ENCRYPTION_KEY_NOT_CONFIGURED");
      expect(() => encryptAtRest("data", "")).toThrow("ENCRYPTION_KEY_NOT_CONFIGURED");
      expect(() => decryptAtRest("v1:iv:tag:enc", undefined)).toThrow("ENCRYPTION_KEY_NOT_CONFIGURED");
    });

    // 7. invalid-length key fails
    it("should throw an error if key is not exactly 64 hex characters", () => {
      const shortKey = "0123456789abcdef";
      expect(() => encryptAtRest("data", shortKey)).toThrow("ENCRYPTION_KEY_INVALID");
      expect(() => decryptAtRest("v1:iv:tag:enc", shortKey)).toThrow("ENCRYPTION_KEY_INVALID");
    });

    // 8. malformed payload fails
    it("should throw error if ciphertext format is invalid during decryption", () => {
      expect(() => decryptAtRest("invalid-format", validHexKey)).toThrow("DECRYPTION_FAILED");
      expect(() => decryptAtRest("v1:onlythree:parts", validHexKey)).toThrow("DECRYPTION_FAILED");
    });

    // 9. unsupported version fails safely
    it("should fail decrypting unsupported payload version formats", () => {
      const unsupportedCiphertext = "v2:0123456789abcdef:0123456789abcdef:0123456789abcdef";
      expect(() => decryptAtRest(unsupportedCiphertext, validHexKey)).toThrow("Unsupported payload version: v2");
    });

    // 10. empty plaintext
    it("should support empty plaintext encryption and decryption", () => {
      const plaintext = "";
      const ciphertext = encryptAtRest(plaintext, validHexKey);
      const decrypted = decryptAtRest(ciphertext, validHexKey);
      expect(decrypted).toBe(plaintext);
    });

    // 11. Unicode payload
    it("should encrypt and decrypt Unicode characters and emojis correctly", () => {
      const plaintext = "Bank Account Name with emojis: 👤✨ 📦🇮🇳";
      const ciphertext = encryptAtRest(plaintext, validHexKey);
      const decrypted = decryptAtRest(ciphertext, validHexKey);
      expect(decrypted).toBe(plaintext);
    });

    // 12. Large payload
    it("should encrypt and decrypt large payloads correctly", () => {
      const plaintext = "A".repeat(100 * 1024); // 100KB payload
      const ciphertext = encryptAtRest(plaintext, validHexKey);
      const decrypted = decryptAtRest(ciphertext, validHexKey);
      expect(decrypted).toBe(plaintext);
    });

    // 13. Decrypting legacy v0 fallback
    it("should support decrypting legacy (v0) non-prefixed format for backward compatibility", () => {
      const plaintext = "legacy-data";

      // Construct a legacy ciphertext manually (without v1:)
      const crypto = require("crypto");
      const key = Buffer.from(validHexKey, "hex");
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      const legacyCiphertext = `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;

      const decrypted = decryptAtRest(legacyCiphertext, validHexKey);
      expect(decrypted).toBe(plaintext);
    });
  });
});
