import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { eventMetadata } from "../../common/http/request-metadata";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { CreateSupportTicketDto } from "./support.dto";
import { SupportService } from "./support.service";

@Controller("support")
export class SupportController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly support: SupportService
  ) {}

  @Post("tickets")
  async create(
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
      eventMetadata("support.controller", request)
    );
    return { data: ticket, message: "Support ticket created" };
  }

  @Get("tickets")
  listMine(@CurrentUser() user: RequestUser) {
    return this.support.listMine(user.id);
  }

  @Get("tickets/:ticketId")
  async getTicketDetail(
    @CurrentUser() user: RequestUser,
    @Param("ticketId") ticketId: string
  ) {
    return this.support.getTicketDetail(user.id, ticketId);
  }
}
