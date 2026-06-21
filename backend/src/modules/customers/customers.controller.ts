import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { AddAddressDto, UpdateCustomerProfileDto } from "./customer.dto";
import { CustomersService } from "./customers.service";

@Controller("customer")
@Roles("CUSTOMER")
export class CustomersController {
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
    return {
      data: await this.customers.addAddress(user.id, body),
      message: "Address added"
    };
  }

  @Get("addresses")
  addresses(@CurrentUser() user: RequestUser) {
    return this.customers.listAddresses(user.id);
  }
}
