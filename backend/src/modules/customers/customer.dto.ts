import { IsNumber, IsOptional, IsString, Matches } from "class-validator";

export class UpdateCustomerProfileDto {
  @IsString()
  name!: string;
}

export class AddAddressDto {
  @IsString()
  receiver_name!: string;

  @Matches(/^[6-9]\d{9}$/)
  receiver_phone!: string;

  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

