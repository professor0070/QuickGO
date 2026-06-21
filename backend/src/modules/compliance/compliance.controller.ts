import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { Public } from "../../common/auth/public.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { eventMetadata } from "../../common/http/request-metadata";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import { CreatePrivacyRequestDto, UpdatePrivacyRequestDto } from "./compliance.dto";
import { ComplianceService } from "./compliance.service";

@Controller()
export class ComplianceController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly compliance: ComplianceService
  ) {}

  @Public()
  @Get("legal-documents")
  activeDocuments() {
    return this.compliance.activeLegalDocuments();
  }

  @Post("legal-documents/:documentId/accept")
  acceptLegalDocument(
    @CurrentUser() user: RequestUser,
    @Param("documentId") documentId: string
  ) {
    return this.compliance.acceptLegalDocument(user.id, documentId);
  }

  @Post("privacy-requests")
  async createPrivacyRequest(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePrivacyRequestDto
  ) {
    const privacyRequest = await this.compliance.createPrivacyRequest(user.id, body);
    await this.eventBus.publish(
      "compliance.privacy_request_created",
      { requestId: privacyRequest.id },
      eventMetadata("compliance.controller", request)
    );
    return { data: privacyRequest, message: "Privacy request created" };
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Get("admin/privacy-requests")
  adminListPrivacyRequests() {
    return this.compliance.listPrivacyRequests();
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Patch("admin/privacy-requests/:requestId")
  async adminUpdatePrivacyRequest(
    @Req() request: Request,
    @Param("requestId") requestId: string,
    @Body() body: UpdatePrivacyRequestDto
  ) {
    const privacyRequest = await this.compliance.updatePrivacyRequest(requestId, body);
    await this.eventBus.publish(
      "compliance.privacy_request_updated",
      { requestId },
      eventMetadata("compliance.controller", request)
    );
    return { data: privacyRequest, message: "Privacy request updated" };
  }
}
