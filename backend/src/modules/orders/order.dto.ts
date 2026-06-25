import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateOrderDto {
  @IsString()
  address_id!: string;

  @IsIn(["COD", "UPI_ON_DELIVERY", "RAZORPAY", "UPI"])
  payment_method!: "COD" | "UPI_ON_DELIVERY" | "RAZORPAY" | "UPI";

  @IsOptional()
  @IsString()
  customer_note?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

