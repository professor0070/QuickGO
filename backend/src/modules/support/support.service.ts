import { Injectable } from "@nestjs/common";
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
}

