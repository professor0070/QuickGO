import { Body, Controller, Get, Patch, Post, Logger, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { AddAddressDto, UpdateCustomerProfileDto } from "./customer.dto";
import { CustomersService } from "./customers.service";

@Controller("customer")
@Roles("CUSTOMER")
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customers: CustomersService) {}

  @Get("profile")
  profile(@CurrentUser() user: RequestUser) {
    return this.customers.profile(user.id);
  }

  @Patch("profile")
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateCustomerProfileDto
  ) {
    return {
      data: await this.customers.updateProfile(user.id, body),
      message: "Customer profile updated"
    };
  }

  @Post("addresses")
  async addAddress(@CurrentUser() user: RequestUser, @Body() body: AddAddressDto) {
    this.logger.log(`AddAddress called for user=${user.id} payload=${JSON.stringify(body)}`);

    // Quick server-side validation for mandatory fields to return fast errors
    const required = ['receiver_name', 'receiver_phone', 'line1', 'city', 'state'];
    for (const key of required) {
      if (!body[key as keyof AddAddressDto]) {
        this.logger.warn(`AddAddress missing field ${key} for user=${user.id}`);
        throw new BadRequestException(`${key} is required`);
      }
    }

    try {
      const data = await this.customers.addAddress(user.id, body);
      this.logger.log(`AddAddress succeeded for user=${user.id} addressId=${data.id}`);
      return { data, message: 'Address added' };
    } catch (err) {
      this.logger.error(`AddAddress failed for user=${user.id}: ${err}`);
      throw new InternalServerErrorException('Failed to add address');
    }
  }

  @Get("addresses")
  addresses(@CurrentUser() user: RequestUser) {
    return this.customers.listAddresses(user.id);
  }
}
