import { IsEnum, IsIn, IsObject, IsOptional, IsString, IsNotEmpty, Matches } from "class-validator";

export enum AppContext {
  CUSTOMER = "CUSTOMER",
  PARTNER = "PARTNER",
  ADMIN = "ADMIN"
}

export class SendOtpDto {
  @Matches(/^(\+91)?[6-9]\d{9}$/)
  phone!: string;

  @IsIn(["LOGIN"])
  purpose!: "LOGIN";
}

export class VerifyOtpDto {
  @Matches(/^(\+91)?[6-9]\d{9}$/)
  phone!: string;

  @IsString()
  otp!: string;

  @IsEnum(AppContext)
  @IsNotEmpty()
  appContext!: AppContext;

  @IsOptional()
  @IsObject()
  device?: {
    platform?: "ANDROID";
    app_version?: string;
    fcm_token?: string;
  };
}

