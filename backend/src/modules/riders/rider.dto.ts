import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class ToggleRiderOnlineDto {
  @IsBoolean()
  is_online!: boolean;
}

export class UpdateRiderProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  vehicle_type?: string;

  @IsOptional()
  @IsString()
  vehicle_number?: string;
}

export class CreateRiderKycDocumentDto {
  @IsString()
  type!: string;

  @IsString()
  document_url!: string;
}

export class RejectAssignedOrderDto {
  @IsString()
  reason!: string;
}

export class SubmitDeliveryProofDto {
  @IsOptional()
  @IsString()
  proof_url?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class MarkPaymentCollectedDto {
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsIn(["COD", "UPI_ON_DELIVERY"])
  payment_method_actual?: "COD" | "UPI_ON_DELIVERY";

  @IsOptional()
  @IsString()
  payment_proof_reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
