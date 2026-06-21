import { Injectable, Logger } from "@nestjs/common";
import { OtpProvider, OtpPurpose } from "./otp-provider";

@Injectable()
export class SmsOtpProvider implements OtpProvider {
  private readonly logger = new Logger(SmsOtpProvider.name);

  async send(phone: string, purpose: OtpPurpose): Promise<void> {
    this.logger.log(`[SMS OTP] Sending OTP to ${phone} for ${purpose} via production SMS gateway (Simulated API send)`);
    // Twilio/Gupshup API integration would be called here.
    return;
  }

  async verify(phone: string, otp: string, purpose: OtpPurpose): Promise<boolean> {
    this.logger.log(`[SMS OTP] Verifying OTP ${otp} for ${phone} (Simulated verification success for 123456 or env code)`);
    const mockCode = process.env.MOCK_OTP_CODE ?? "123456";
    return otp === mockCode;
  }
}
