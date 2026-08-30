import { ConfigService } from "@nestjs/config";
import { MockOtpProvider } from "./mock-otp.provider";

function createProvider(mockCode?: string): MockOtpProvider {
  const config = {
    get: (key: string) => {
      if (key === "MOCK_OTP_CODE") return mockCode;
      return undefined;
    }
  } as unknown as ConfigService;
  return new MockOtpProvider(config);
}

describe("MockOtpProvider", () => {
  describe("send", () => {
    it("resolves without error", async () => {
      const provider = createProvider();
      await expect(provider.send("+919876543210", "LOGIN")).resolves.toBeUndefined();
    });
  });

  describe("verify", () => {
    it("accepts the default OTP code (123456) when MOCK_OTP_CODE is not configured", async () => {
      const provider = createProvider(undefined);
      const result = await provider.verify("+919876543210", "123456", "LOGIN");
      expect(result).toBe(true);
    });

    it("rejects an incorrect OTP when MOCK_OTP_CODE is not configured", async () => {
      const provider = createProvider(undefined);
      const result = await provider.verify("+919876543210", "000000", "LOGIN");
      expect(result).toBe(false);
    });

    it("accepts the configured MOCK_OTP_CODE value", async () => {
      const provider = createProvider("999999");
      const result = await provider.verify("+919876543210", "999999", "LOGIN");
      expect(result).toBe(true);
    });

    it("rejects the default code when a custom MOCK_OTP_CODE is configured", async () => {
      const provider = createProvider("999999");
      const result = await provider.verify("+919876543210", "123456", "LOGIN");
      expect(result).toBe(false);
    });

    it("rejects empty OTP", async () => {
      const provider = createProvider();
      const result = await provider.verify("+919876543210", "", "LOGIN");
      expect(result).toBe(false);
    });

    it("rejects OTP with extra whitespace", async () => {
      const provider = createProvider();
      const result = await provider.verify("+919876543210", " 123456 ", "LOGIN");
      expect(result).toBe(false);
    });

    it("is phone-agnostic (ignores phone parameter)", async () => {
      const provider = createProvider();
      const result1 = await provider.verify("+919876543210", "123456", "LOGIN");
      const result2 = await provider.verify("+919999999999", "123456", "LOGIN");
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});
