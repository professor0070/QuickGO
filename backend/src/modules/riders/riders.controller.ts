import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { eventMetadata } from "../../common/http/request-metadata";
import { Idempotent } from "../../common/idempotency/idempotent.decorator";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { CreateSupportTicketDto } from "../support/support.dto";
import { SupportService } from "../support/support.service";
import {
  CreateRiderKycDocumentDto,
  MarkPaymentCollectedDto,
  RejectAssignedOrderDto,
  SubmitDeliveryProofDto,
  ToggleRiderOnlineDto,
  UpdateRiderProfileDto
} from "./rider.dto";
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

  @Get("profile")
  profile(@CurrentUser() user: RequestUser) {
    return this.ridersService.profile(user.id);
  }

  @Patch("profile")
  async updateProfile(@CurrentUser() user: RequestUser, @Body() body: UpdateRiderProfileDto) {
    return {
      data: await this.ridersService.updateProfile(user.id, body),
      message: "Rider profile updated"
    };
  }

  @Patch("online-status")
  async toggleOnline(@CurrentUser() user: RequestUser, @Body() body: ToggleRiderOnlineDto) {
    return {
      data: await this.ridersService.toggleOnline(user.id, body),
      message: "Rider status updated"
    };
  }

  @Get("kyc-documents")
  kycDocuments(@CurrentUser() user: RequestUser) {
    return this.ridersService.kycDocuments(user.id);
  }

  @Post("kyc-documents")
  async createKycDocument(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateRiderKycDocumentDto
  ) {
    return {
      data: await this.ridersService.createKycDocument(user.id, body),
      message: "Rider KYC document submitted"
    };
  }

  @Get("orders")
  assignedOrders(@CurrentUser() user: RequestUser) {
    return this.ridersService.assignedOrders(user.id);
  }

  @Get("order-history")
  orderHistory(@CurrentUser() user: RequestUser) {
    return this.ridersService.orderHistory(user.id);
  }

  @Get("orders/:orderId")
  assignedOrderDetail(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string) {
    return this.ridersService.assignedOrderDetail(user.id, orderId);
  }

  @Idempotent("RIDER_ACCEPT_ORDER")
  @Post("orders/:orderId/accept")
  async acceptAssignedOrder(
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    return {
      data: await this.ridersService.acceptAssignedOrder(user.id, orderId),
      message: "Assigned order accepted"
    };
  }

  @Idempotent("RIDER_REJECT_ORDER")
  @Post("orders/:orderId/reject")
  async rejectAssignedOrder(
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: RejectAssignedOrderDto
  ) {
    return {
      data: await this.ridersService.rejectAssignedOrder(user.id, orderId, body),
      message: "Assigned order rejected"
    };
  }

  @Post("orders/:orderId/arrived")
  async arrived(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    const result = await this.ridersService.markArrived(user.id, orderId);
    await this.eventBus.publish(
      "delivery.rider_arrived",
      { orderId },
      eventMetadata("riders.controller", request)
    );
    return result;
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

  @Get("orders/:orderId/delivery-proof")
  deliveryProofs(@CurrentUser() user: RequestUser, @Param("orderId") orderId: string) {
    return this.ridersService.deliveryProofsForOrder(user.id, orderId);
  }

  @Idempotent("SUBMIT_DELIVERY_PROOF")
  @Post("orders/:orderId/delivery-proof")
  async submitDeliveryProof(
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: SubmitDeliveryProofDto
  ) {
    return {
      data: await this.ridersService.submitDeliveryProof(user.id, orderId, body),
      message: "Delivery proof submitted"
    };
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
    const result = await this.ridersService.markPaymentCollected(user.id, orderId, body);
    await this.eventBus.publish(
      "payment.collected",
      {
        orderId,
        paymentId: result.payment.id,
        amount: body.amount,
        ...(result.payment.collectorType ? { collectorType: result.payment.collectorType } : {}),
        ...(result.payment.collectorId ? { collectorId: result.payment.collectorId } : {}),
        ...(result.payment.paymentMethodActual
          ? { paymentMethodActual: result.payment.paymentMethodActual }
          : {})
      },
      eventMetadata("riders.controller", request)
    );
    return result;
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
