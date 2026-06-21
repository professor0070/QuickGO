import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateSupportTicketDto {
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  @IsString()
  subject!: string;

  @IsString()
  description!: string;
}

