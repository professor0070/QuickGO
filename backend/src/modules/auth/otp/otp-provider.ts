export type OtpPurpose = "LOGIN";

export interface OtpProvider {
  send(phone: string, purpose: OtpPurpose): Promise<void>;
  verify(phone: string, otp: string, purpose: OtpPurpose): Promise<boolean>;
}

