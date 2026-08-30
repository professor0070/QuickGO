import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches
} from "class-validator";

export class AssignRiderDto {
  @IsString()
  rider_id!: string;

  @IsString()
  reason!: string;
}

export class AdminCancelOrderDto {
  @IsString()
  reason!: string;
}

export class ReconcilePaymentDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsIn(["VERIFIED", "SHORT_COLLECTED", "OVER_COLLECTED", "DISPUTED", "SETTLED"])
  status?: "VERIFIED" | "SHORT_COLLECTED" | "OVER_COLLECTED" | "DISPUTED" | "SETTLED";

  @IsOptional()
  @IsNumber()
  amount_collected?: number;
}

export class MarkPaymentCollectedDto {
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsIn(["COD", "UPI_ON_DELIVERY"])
  payment_method_actual?: "COD" | "UPI_ON_DELIVERY";

  @IsOptional()
  @IsIn(["RIDER", "VENDOR", "ADMIN", "QUICKGO_ADMIN"])
  collector_type?: "RIDER" | "VENDOR" | "ADMIN" | "QUICKGO_ADMIN";

  @IsOptional()
  @IsString()
  collector_id?: string;

  @IsOptional()
  @IsString()
  payment_proof_reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateVendorDto {
  @IsString()
  shop_name!: string;

  @IsString()
  owner_name!: string;

  @Matches(/^[6-9]\d{9}$/)
  owner_phone!: string;

  @IsIn(["RESTAURANT_FOOD", "VEGETABLES", "FRUITS", "DAIRY"])
  category_code!: "RESTAURANT_FOOD" | "VEGETABLES" | "FRUITS" | "DAIRY";

  @IsString()
  service_zone_id!: string;

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

  @IsNumber()
  commission_rate!: number;
}

export class CreateRiderDto {
  @IsString()
  name!: string;

  @Matches(/^[6-9]\d{9}$/)
  phone!: string;

  @IsString()
  service_zone_id!: string;
}

export class CreateProductDto {
  @IsString()
  vendor_id!: string;

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

export class AdminReasonDto {
  @IsString()
  reason!: string;
}

export class UpdateVendorStatusDto extends AdminReasonDto {
  @IsIn(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "PAUSED", "BLOCKED", "SUSPENDED"])
  status!: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED" | "BLOCKED" | "SUSPENDED";

  @IsOptional()
  @IsIn([
    "FSSAI_PENDING",
    "FSSAI_VERIFIED",
    "FSSAI_EXPIRED",
    "FSSAI_REJECTED",
    "FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED"
  ])
  fssai_status?:
    | "FSSAI_PENDING"
    | "FSSAI_VERIFIED"
    | "FSSAI_EXPIRED"
    | "FSSAI_REJECTED"
    | "FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED";
}

export class UpdateRiderStatusDto extends AdminReasonDto {
  @IsIn(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "PAUSED", "BLOCKED", "SUSPENDED"])
  status!: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED" | "BLOCKED" | "SUSPENDED";
}

export class UpdateProductStatusDto extends AdminReasonDto {
  @IsIn(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "PAUSED", "BLOCKED"])
  status!: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED" | "BLOCKED";

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;
}

export class UpdateCategoryStatusDto extends AdminReasonDto {
  @IsBoolean()
  is_active!: boolean;
}

export class UpdateSupportTicketDto extends AdminReasonDto {
  @IsIn([
    "OPEN",
    "IN_REVIEW",
    "IN_PROGRESS",
    "WAITING_FOR_VENDOR",
    "WAITING_FOR_RIDER",
    "RESOLVED",
    "REJECTED",
    "CLOSED"
  ])
  status!:
    | "OPEN"
    | "IN_REVIEW"
    | "IN_PROGRESS"
    | "WAITING_FOR_VENDOR"
    | "WAITING_FOR_RIDER"
    | "RESOLVED"
    | "REJECTED"
    | "CLOSED";

  @IsOptional()
  @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  @IsOptional()
  @IsString()
  admin_note?: string;
}

export class ApprovePayoutDto extends AdminReasonDto {
  @IsIn(["PAYOUT_PENDING", "PAYOUT_PAID", "PAYOUT_HOLD", "PAYOUT_DISPUTED"])
  status!: "PAYOUT_PENDING" | "PAYOUT_PAID" | "PAYOUT_HOLD" | "PAYOUT_DISPUTED";

  @IsOptional()
  @IsString()
  adjustment_note?: string;
}

export class CreateVendorComplianceDocumentDto {
  @IsIn(["FSSAI", "GST", "PAN", "AADHAAR", "SHOP_LICENSE"])
  type!: "FSSAI" | "GST" | "PAN" | "AADHAAR" | "SHOP_LICENSE";

  @IsString()
  document_url!: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class CreateRiderKycDocumentDto {
  @IsString()
  type!: string;

  @IsString()
  document_url!: string;
}

export class ReviewVendorComplianceDocumentDto extends AdminReasonDto {
  @IsIn(["APPROVED", "REJECTED", "EXPIRED"])
  status!: "APPROVED" | "REJECTED" | "EXPIRED";

  @IsOptional()
  @IsIn([
    "FSSAI_PENDING",
    "FSSAI_VERIFIED",
    "FSSAI_EXPIRED",
    "FSSAI_REJECTED",
    "FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED"
  ])
  fssai_status?:
    | "FSSAI_PENDING"
    | "FSSAI_VERIFIED"
    | "FSSAI_EXPIRED"
    | "FSSAI_REJECTED"
    | "FSSAI_NOT_APPLICABLE_REVIEW_REQUIRED";
}

export class ReviewRiderKycDocumentDto extends AdminReasonDto {
  @IsIn(["APPROVED", "REJECTED", "EXPIRED"])
  status!: "APPROVED" | "REJECTED" | "EXPIRED";
}

export class CreateCategoryDto {
  @IsIn(["RESTAURANT_FOOD", "VEGETABLES", "FRUITS", "DAIRY"])
  code!: "RESTAURANT_FOOD" | "VEGETABLES" | "FRUITS" | "DAIRY";

  @IsString()
  name!: string;

  @IsNumber()
  sort_order!: number;

  @IsBoolean()
  is_fresh!: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_fresh?: boolean;
}

export class AssignRoleDto {
  @IsString()
  role!: string;
}

export class AddPincodeDto {
  @IsString()
  @Matches(/^\d{6}$/)
  pincode!: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class CreateZoneAdminDto {
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class AssignZoneAdminDto {
  @IsString()
  admin_user_id!: string;

  @IsString()
  service_zone_id!: string;
}

export class PartnerSuspensionDto {
  @IsBoolean()
  status!: boolean;

  @IsString()
  reason!: string;
}

export class ReviewBankDetailsDto {
  @IsString()
  @IsIn(["APPROVED", "REJECTED"])
  status!: "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  reason?: string;
}

