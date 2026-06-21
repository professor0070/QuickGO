import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { eventMetadata } from "../../common/http/request-metadata";
import { Idempotent } from "../../common/idempotency/idempotent.decorator";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { CreateSupportTicketDto } from "../support/support.dto";
import { SupportService } from "../support/support.service";
import { MarkPaymentCollectedDto, ToggleRiderOnlineDto } from "./rider.dto";
import { RidersService } from "./riders.service";

@Controller("rider")
@Roles("RIDER")
export class RidersController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly support: SupportService,
    private readonly ridersService: RidersService
  ) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: RequestUser) {
    return this.ridersService.dashboard(user.id);
  }

  @Patch("online-status")
  async toggleOnline(@CurrentUser() user: RequestUser, @Body() body: ToggleRiderOnlineDto) {
    return {
      data: await this.ridersService.toggleOnline(user.id, body),
      message: "Rider status updated"
    };
  }

  @Get("orders")
  assignedOrders(@CurrentUser() user: RequestUser) {
    return this.ridersService.assignedOrders(user.id);
  }

  @Get("orders/:orderId")
  assignedOrderDetail(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string) {
    return this.ridersService.assignedOrderDetail(user.id, orderId);
  }

  @Post("orders/:orderId/picked-up")
  async pickedUp(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    const order = await this.ridersService.markPickedUp(user.id, orderId);
    await this.eventBus.publish(
      "delivery.picked_up",
      { orderId },
      eventMetadata("riders.controller", request)
    );
    return order;
  }

  @Idempotent("MARK_DELIVERED")
  @Post("orders/:orderId/delivered")
  async delivered(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    const order = await this.ridersService.markDelivered(user.id, orderId);
    await this.eventBus.publish(
      "delivery.delivered",
      { orderId },
      eventMetadata("riders.controller", request)
    );
    return order;
  }

  @Idempotent("MARK_PAYMENT_COLLECTED")
  @Post("orders/:orderId/payment-collected")
  async paymentCollected(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: MarkPaymentCollectedDto
  ) {
    const collection = await this.ridersService.markPaymentCollected(user.id, orderId, body);
    await this.eventBus.publish(
      "payment.collected",
      { orderId, amount: body.amount },
      eventMetadata("riders.controller", request)
    );
    return collection;
  }

  @Post("issues")
  async reportIssue(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSupportTicketDto
  ) {
    const ticket = await this.support.createTicket(user.id, body);
    await this.eventBus.publish(
      "support.ticket_created",
      {
        ticketId: ticket.id,
        subject: ticket.subject
      },
      eventMetadata("riders.controller", request)
    );

    return {
      data: ticket,
      message: "Issue reported"
    };
  }
}
