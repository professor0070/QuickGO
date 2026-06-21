import { IsDateString, IsOptional, IsString } from "class-validator";

export class ProductImageUploadDto {
  @IsString()
  reason!: string;
}

export class VendorComplianceUploadDto {
  @IsString()
  type!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class RiderKycUploadDto {
  @IsString()
  type!: string;

  @IsString()
  reason!: string;
}
