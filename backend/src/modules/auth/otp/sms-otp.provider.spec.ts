import { SmsOtpProvider } from "./sms-otp.provider";

describe("SmsOtpProvider", () => {
  let provider: SmsOtpProvider;

  beforeEach(() => {
    provider = new SmsOtpProvider();
  });

  it("fails closed until a real SMS gateway adapter is configured", async () => {
    await expect(provider.send("9876543210", "LOGIN")).rejects.toThrow(
      "Production SMS provider is not configured"
    );
    await expect(provider.verify("9876543210", "123456", "LOGIN")).rejects.toThrow(
      "Production SMS provider is not configured"
    );
  });
});
