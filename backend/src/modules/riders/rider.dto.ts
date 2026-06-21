import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class ToggleRiderOnlineDto {
  @IsBoolean()
  is_online!: boolean;
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
