import { IsIn, IsObject, IsOptional, IsString, Matches } from "class-validator";

export class SendOtpDto {
  @Matches(/^[6-9]\d{9}$/)
  phone!: string;

  @IsIn(["LOGIN"])
  purpose!: "LOGIN";
}

export class VerifyOtpDto {
  @Matches(/^[6-9]\d{9}$/)
  phone!: string;

  @IsString()
  otp!: string;

  @IsOptional()
  @IsObject()
  device?: {
    platform?: "ANDROID";
    app_version?: string;
    fcm_token?: string;
  };
}

