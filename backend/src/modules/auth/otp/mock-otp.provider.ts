import { Injectable } from "@nestjs/common";
import { OtpProvider, OtpPurpose } from "./otp-provider";

@Injectable()
export class MockOtpProvider implements OtpProvider {
  async send(_phone: string, _purpose: OtpPurpose): Promise<void> {
    return;
  }

  async verify(_phone: string, otp: string, _purpose: OtpPurpose): Promise<boolean> {
    return otp === (process.env.MOCK_OTP_CODE ?? "123456");
  }
}

