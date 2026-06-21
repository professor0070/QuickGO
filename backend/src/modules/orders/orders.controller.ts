import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { eventMetadata } from "../../common/http/request-metadata";
import { Idempotent } from "../../common/idempotency/idempotent.decorator";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { CancelOrderDto, CreateOrderDto } from "./order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@Roles("CUSTOMER")
export class OrdersController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly orders: OrdersService
  ) {}

  @Idempotent("CREATE_ORDER")
  @Post()
  async create(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateOrderDto
  ) {
    const order = await this.orders.createFromActiveCart(user.id, body);

    await this.eventBus.publish(
      "order.placed",
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod
      },
      eventMetadata("orders.controller", request)
    );

    return {
      data: order,
      message: "Order placed"
    };
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.orders.listMine(user.id);
  }

  @Get(":orderId")
  detail(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string) {
    return this.orders.detail(user.id, orderId);
  }

  @Idempotent("CANCEL_ORDER")
  @Post(":orderId/cancel")
  async cancel(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: CancelOrderDto
  ) {
    const order = await this.orders.cancel(user.id, orderId, body);
    const reason = order.cancellationReason ?? body.reason ?? "Customer requested cancellation";
    await this.eventBus.publish(
      "order.cancelled",
      {
        orderId,
        reason
      },
      eventMetadata("orders.controller", request)
    );

    return order;
  }
}
