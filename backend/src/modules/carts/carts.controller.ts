import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { AddCartItemDto, UpdateCartItemDto } from "./cart.dto";
import { CartsService } from "./carts.service";

@Controller("cart")
@Roles("CUSTOMER")
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  @Get()
  activeCart(@CurrentUser() user: RequestUser) {
    return this.carts.getActiveCart(user.id);
  }

  @Post("items")
  async addItem(@CurrentUser() user: RequestUser, @Body() body: AddCartItemDto) {
    return {
      data: await this.carts.addItem(user.id, body),
      message: "Item added to cart"
    };
  }

  @Patch("items/:itemId")
  updateItem(
    @CurrentUser() user: RequestUser,
    @Param("itemId") itemId: string,
    @Body() body: UpdateCartItemDto
  ) {
    return this.carts.updateItem(user.id, itemId, body);
  }

  @Delete()
  async clear(@CurrentUser() user: RequestUser) {
    return { message: "Cart cleared", data: await this.carts.clear(user.id) };
  }
}
