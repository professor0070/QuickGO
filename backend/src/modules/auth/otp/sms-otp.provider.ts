import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { OtpProvider, OtpPurpose } from "./otp-provider";

@Injectable()
export class SmsOtpProvider implements OtpProvider {
  private readonly logger = new Logger(SmsOtpProvider.name);

  async send(phone: string, purpose: OtpPurpose): Promise<void> {
    this.logger.warn(
      `[SMS OTP] Provider requested for ${phone} (${purpose}) but no production SMS integration is configured`
    );
    throw new ServiceUnavailableException(
      "Production SMS provider is not configured for this environment"
    );
  }

  async verify(phone: string, _otp: string, purpose: OtpPurpose): Promise<boolean> {
    this.logger.warn(
      `[SMS OTP] Verification requested for ${phone} (${purpose}) but no production SMS integration is configured`
    );
    throw new ServiceUnavailableException(
      "Production SMS provider is not configured for this environment"
    );
  }
}
