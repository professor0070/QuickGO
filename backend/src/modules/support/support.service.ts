import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { CreateSupportTicketDto } from "./support.dto";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  createTicket(userId: string, dto: CreateSupportTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        orderId: dto.order_id,
        priority: dto.priority ?? "MEDIUM",
        subject: dto.subject,
        description: dto.description,
        createdBy: userId,
        events: {
          create: {
            actorId: userId,
            message: "Ticket created"
          }
        }
      },
      include: { events: true }
    });
  }

  listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: "desc" },
      include: { events: true }
    });
  }

  async getTicketDetail(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { events: { orderBy: { createdAt: "asc" } }, order: true }
    });
    if (!ticket) {
      throw new NotFoundException("Support ticket not found");
    }
    if (ticket.createdBy !== userId) {
      throw new ForbiddenException("You do not have access to this support ticket");
    }
    return ticket;
  }
}

