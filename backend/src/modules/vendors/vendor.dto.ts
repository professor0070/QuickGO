import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class ToggleShopStatusDto {
  @IsBoolean()
  is_open!: boolean;
}

export class RejectOrderDto {
  @IsString()
  reason!: string;
}

export class UpdateProductAvailabilityDto {
  @IsBoolean()
  is_available!: boolean;
}

export class UpdateProductPriceDto {
  @IsNumber()
  price!: number;

  @IsNumber()
  mrp!: number;
}

export class VendorOrderStatusDto {
  @IsIn(["PREPARING_OR_PACKING", "READY_FOR_PICKUP"])
  status!: "PREPARING_OR_PACKING" | "READY_FOR_PICKUP";
}

export class UpdateVendorProfileDto {
  @IsString()
  shop_name!: string;

  @IsString()
  owner_name!: string;

  @IsString()
  address_line!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UploadComplianceDocumentDto {
  @IsIn(["FSSAI", "GST", "PAN", "AADHAAR", "SHOP_LICENSE"])
  type!: "FSSAI" | "GST" | "PAN" | "AADHAAR" | "SHOP_LICENSE";

  @IsString()
  document_url!: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class VendorCreateProductDto {
  @IsString()
  category_id!: string;

  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;

  @IsOptional()
  @IsNumber()
  shelf_life_days?: number;

  @IsOptional()
  @IsString()
  freshness_status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}

export class VendorUpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;

  @IsOptional()
  @IsNumber()
  shelf_life_days?: number;

  @IsOptional()
  @IsString()
  freshness_status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}

