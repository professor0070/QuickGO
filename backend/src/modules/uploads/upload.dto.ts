import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export class ProductImageUploadDto {
  @IsString()
  reason!: string;
}

export class VendorComplianceUploadDto {
  @IsIn(["FSSAI", "GST", "PAN", "AADHAAR", "SHOP_LICENSE"])
  type!: "FSSAI" | "GST" | "PAN" | "AADHAAR" | "SHOP_LICENSE";

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class RiderKycUploadDto {
  @IsIn(["ID_PROOF", "ADDRESS_PROOF", "DRIVING_LICENSE", "VEHICLE_RC"])
  type!: "ID_PROOF" | "ADDRESS_PROOF" | "DRIVING_LICENSE" | "VEHICLE_RC";

  @IsString()
  reason!: string;
}
