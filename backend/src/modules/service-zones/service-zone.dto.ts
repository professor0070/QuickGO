import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateServiceZoneDto {
  @IsString()
  name!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsNumber()
  center_latitude!: number;

  @IsNumber()
  center_longitude!: number;

  @IsOptional()
  @IsNumber()
  radius_km?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString()
  reason!: string;
}

export class UpdateServiceZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  center_latitude?: number;

  @IsOptional()
  @IsNumber()
  center_longitude?: number;

  @IsOptional()
  @IsNumber()
  radius_km?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString()
  reason!: string;
}
