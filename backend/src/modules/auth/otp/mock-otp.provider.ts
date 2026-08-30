import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OtpProvider, OtpPurpose } from "./otp-provider";

@Injectable()
export class MockOtpProvider implements OtpProvider {
  private readonly mockCode: string;

  constructor(config: ConfigService) {
    this.mockCode = config.get<string>("MOCK_OTP_CODE") ?? "123456";
  }

  async send(_phone: string, _purpose: OtpPurpose): Promise<void> {
    return;
  }

  async verify(_phone: string, otp: string, _purpose: OtpPurpose): Promise<boolean> {
    return otp === this.mockCode;
  }
}

