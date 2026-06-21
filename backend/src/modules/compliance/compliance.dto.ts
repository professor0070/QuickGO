import { IsIn, IsOptional, IsString } from "class-validator";

export class CreatePrivacyRequestDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePrivacyRequestDto {
  @IsIn(["OPEN", "IN_PROGRESS", "COMPLETED", "REJECTED"])
  status!: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

  @IsOptional()
  @IsString()
  admin_note?: string;
}

