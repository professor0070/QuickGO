import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { CreatePrivacyRequestDto, UpdatePrivacyRequestDto } from "./compliance.dto";

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  activeLegalDocuments() {
    return this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }

  acceptLegalDocument(userId: string, legalDocumentId: string) {
    return this.prisma.consentRecord.upsert({
      where: {
        userId_legalDocumentId: {
          userId,
          legalDocumentId
        }
      },
      update: { acceptedAt: new Date() },
      create: {
        userId,
        legalDocumentId
      }
    });
  }

  createPrivacyRequest(userId: string, dto: CreatePrivacyRequestDto) {
    return this.prisma.privacyRequest.create({
      data: {
        userId,
        type: dto.type,
        description: dto.description
      }
    });
  }

  listPrivacyRequests() {
    return this.prisma.privacyRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, phone: true } } }
    });
  }

  updatePrivacyRequest(requestId: string, dto: UpdatePrivacyRequestDto) {
    return this.prisma.privacyRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        adminNote: dto.admin_note
      }
    });
  }
}

