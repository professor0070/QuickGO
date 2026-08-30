import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { ZoneScopeGuard } from "../../common/auth/zone-scope.guard";
import { eventMetadata } from "../../common/http/request-metadata";
import { Idempotent } from "../../common/idempotency/idempotent.decorator";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import {
  AdminCancelOrderDto,
  AssignRiderDto,
  CreateRiderKycDocumentDto,
  CreateProductDto,
  CreateRiderDto,
  CreateVendorDto,
  CreateVendorComplianceDocumentDto,
  MarkPaymentCollectedDto,
  ReconcilePaymentDto,
  ReviewRiderKycDocumentDto,
  ReviewVendorComplianceDocumentDto,
  ReviewBankDetailsDto,
  UpdateCategoryStatusDto,
  UpdateProductStatusDto,
  UpdateRiderStatusDto,
  UpdateSupportTicketDto,
  UpdateVendorStatusDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ApprovePayoutDto,
  AssignRoleDto,
  AddPincodeDto,
  CreateZoneAdminDto,
  AssignZoneAdminDto,
  PartnerSuspensionDto
} from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@Roles("SUPER_ADMIN", "ZONE_ADMIN")
@UseGuards(ZoneScopeGuard)
export class AdminController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly admin: AdminService
  ) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: RequestUser) {
    return this.admin.dashboard(user.id);
  }

  @Get("attention-queue")
  attentionQueue(@CurrentUser() user: RequestUser) {
    return this.admin.attentionQueue(user.id);
  }

  @Get(["reconciliation-alerts", "reconciliation/alerts"])
  reconciliationAlerts(@CurrentUser() user: RequestUser) {
    return this.admin.reconciliationAlerts(user.id);
  }

  @Get("reconciliation/summary")
  reconciliationSummary(@CurrentUser() user: RequestUser) {
    return this.admin.reconciliationSummary(user.id);
  }

  @Get("payments")
  allPayments(@CurrentUser() user: RequestUser) {
    return this.admin.allPayments(user.id);
  }

  @Get("orders")
  orders(@CurrentUser() user: RequestUser) {
    return this.admin.orders(user.id);
  }

  @Get("orders/:orderId")
  orderDetail(@Param("orderId") orderId: string) {
    return this.admin.orderDetail(orderId);
  }

  @Idempotent("ASSIGN_RIDER")
  @Post("orders/:orderId/assign-rider")
  async assignRider(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: AssignRiderDto
  ) {
    const order = await this.admin.assignRider(orderId, body, user.id);
    await this.eventBus.publish(
      "delivery.rider_assigned",
      { orderId, riderId: body.rider_id, reason: body.reason },
      eventMetadata("admin.controller", request)
    );
    return { data: order, message: "Rider assigned" };
  }

  @Idempotent("ASSIGN_RIDER")
  @Post("orders/:orderId/reassign-rider")
  async reassignRider(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: AssignRiderDto
  ) {
    const order = await this.admin.assignRider(orderId, body, user.id);
    await this.eventBus.publish(
      "delivery.rider_reassigned",
      { orderId, riderId: body.rider_id, reason: body.reason },
      eventMetadata("admin.controller", request)
    );
    return { data: order, message: "Rider reassigned" };
  }

  @Idempotent("CANCEL_ORDER")
  @Post("orders/:orderId/cancel")
  async cancelOrder(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: AdminCancelOrderDto
  ) {
    const order = await this.admin.cancelOrder(orderId, body, user.id);
    await this.eventBus.publish(
      "order.cancelled",
      { orderId, reason: body.reason },
      eventMetadata("admin.controller", request)
    );
    return { data: order, message: "Order cancelled" };
  }

  @Idempotent("RECONCILE_PAYMENT")
  @Patch("payments/:paymentId/reconcile")
  async reconcilePayment(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("paymentId") paymentId: string,
    @Body() body: ReconcilePaymentDto
  ) {
    const payment = await this.admin.reconcilePayment(paymentId, body, user.id);
    await this.eventBus.publish(
      "payment.reconciled",
      {
        paymentId,
        orderId: payment.orderId,
        status: payment.status,
        amountCollected: Number(payment.amountCollected),
        reason: body.reason
      },
      eventMetadata("admin.controller", request)
    );
    return { data: payment, message: "Payment reconciled" };
  }

  @Idempotent("MARK_PAYMENT_COLLECTED")
  @Post("orders/:orderId/payment-collected")
  async markPaymentCollected(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: MarkPaymentCollectedDto
  ) {
    const payment = await this.admin.markPaymentCollected(orderId, body, user.id);
    await this.eventBus.publish(
      "payment.collected",
      {
        orderId,
        paymentId: payment.id,
        amount: body.amount,
        ...(payment.collectorType ? { collectorType: payment.collectorType } : {}),
        ...(payment.collectorId ? { collectorId: payment.collectorId } : {}),
        ...(payment.paymentMethodActual ? { paymentMethodActual: payment.paymentMethodActual } : {})
      },
      eventMetadata("admin.controller", request)
    );
    return { data: payment, message: "Payment collection recorded" };
  }

  @Get("vendors")
  vendors(@CurrentUser() user: RequestUser) {
    return this.admin.vendors(user.id);
  }

  @Post("vendors")
  async createVendor(@Body() body: CreateVendorDto) {
    return { data: await this.admin.createVendor(body), message: "Vendor created" };
  }

  @Patch("vendors/:vendorId/status")
  async updateVendorStatus(
    @CurrentUser() user: RequestUser,
    @Param("vendorId") vendorId: string,
    @Body() body: UpdateVendorStatusDto
  ) {
    return {
      data: await this.admin.updateVendorStatus(vendorId, body, user.id),
      message: "Vendor status updated"
    };
  }

  @Get("vendors/:vendorId/compliance-documents")
  vendorComplianceDocuments(@Param("vendorId") vendorId: string) {
    return this.admin.listVendorComplianceDocuments(vendorId);
  }

  @Post("vendors/:vendorId/compliance-documents")
  async createVendorComplianceDocument(
    @CurrentUser() user: RequestUser,
    @Param("vendorId") vendorId: string,
    @Body() body: CreateVendorComplianceDocumentDto
  ) {
    return {
      data: await this.admin.createVendorComplianceDocument(vendorId, body, user.id),
      message: "Vendor compliance document stored"
    };
  }

  @Patch("vendor-compliance-documents/:documentId/review")
  async reviewVendorComplianceDocument(
    @CurrentUser() user: RequestUser,
    @Param("documentId") documentId: string,
    @Body() body: ReviewVendorComplianceDocumentDto
  ) {
    return {
      data: await this.admin.reviewVendorComplianceDocument(documentId, body, user.id),
      message: "Vendor compliance document reviewed"
    };
  }

  @Post("compliance-documents/process-expiries")
  async processDocumentExpiries() {
    return {
      data: await this.admin.processDocumentExpiries(),
      message: "Expired documents processed successfully"
    };
  }

  @Get("compliance-documents/:documentId/view")
  async viewComplianceDocument(
    @Param("documentId") documentId: string,
    @Res() res: any
  ) {
    const streamInfo = await this.admin.getDocumentStream(documentId);
    
    res.headers({
      "Content-Type": streamInfo.mimeType,
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${streamInfo.filename}"`
    });

    if (streamInfo.type === "local") {
      const fs = require("fs");
      const readStream = fs.createReadStream(streamInfo.filePath);
      res.send(readStream);
    } else {
      const https = require("https");
      https.get(streamInfo.url, (response: any) => {
        res.send(response);
      }).on("error", (err: any) => {
        res.status(500).send({ message: `Failed to stream remote document: ${err.message}` });
      });
    }
  }

  @Get("vendors/:vendorId/bank-details")
  async getVendorBankDetails(
    @Param("vendorId") vendorId: string
  ) {
    return {
      data: await this.admin.getVendorBankDetails(vendorId),
      message: "Vendor bank details retrieved"
    };
  }

  @Get("riders/:riderId/bank-details")
  async getRiderBankDetails(
    @Param("riderId") riderId: string
  ) {
    return {
      data: await this.admin.getRiderBankDetails(riderId),
      message: "Rider bank details retrieved"
    };
  }

  @Get("vendors/:vendorId/bank-detail-history")
  async getVendorBankDetailHistory(
    @Param("vendorId") vendorId: string
  ) {
    return {
      data: await this.admin.getPartnerBankDetailHistory("vendor", vendorId),
      message: "Vendor bank detail history retrieved"
    };
  }

  @Get("riders/:riderId/bank-detail-history")
  async getRiderBankDetailHistory(
    @Param("riderId") riderId: string
  ) {
    return {
      data: await this.admin.getPartnerBankDetailHistory("rider", riderId),
      message: "Rider bank detail history retrieved"
    };
  }

  @Patch("bank-detail-versions/:versionId/review")
  async reviewBankDetailsVersion(
    @CurrentUser() user: RequestUser,
    @Param("versionId") versionId: string,
    @Body() body: ReviewBankDetailsDto
  ) {
    return {
      data: await this.admin.reviewBankDetailsVersion(versionId, body, user.id),
      message: "Bank details reviewed successfully"
    };
  }

  @Get("riders")
  riders(@CurrentUser() user: RequestUser) {
    return this.admin.riders(user.id);
  }

  @Get("rider-operations")
  riderOperations(@CurrentUser() user: RequestUser) {
    return this.admin.riderOperations(user.id);
  }

  @Post("riders")
  async createRider(@Body() body: CreateRiderDto) {
    return { data: await this.admin.createRider(body), message: "Rider created" };
  }

  @Patch("riders/:riderId/status")
  async updateRiderStatus(
    @CurrentUser() user: RequestUser,
    @Param("riderId") riderId: string,
    @Body() body: UpdateRiderStatusDto
  ) {
    return {
      data: await this.admin.updateRiderStatus(riderId, body, user.id),
      message: "Rider status updated"
    };
  }

  @Get("riders/:riderId/kyc-documents")
  riderKycDocuments(@Param("riderId") riderId: string) {
    return this.admin.listRiderKycDocuments(riderId);
  }

  @Post("riders/:riderId/kyc-documents")
  async createRiderKycDocument(
    @CurrentUser() user: RequestUser,
    @Param("riderId") riderId: string,
    @Body() body: CreateRiderKycDocumentDto
  ) {
    return {
      data: await this.admin.createRiderKycDocument(riderId, body, user.id),
      message: "Rider KYC document stored"
    };
  }

  @Patch("rider-kyc-documents/:documentId/review")
  async reviewRiderKycDocument(
    @CurrentUser() user: RequestUser,
    @Param("documentId") documentId: string,
    @Body() body: ReviewRiderKycDocumentDto
  ) {
    return {
      data: await this.admin.reviewRiderKycDocument(documentId, body, user.id),
      message: "Rider KYC document reviewed"
    };
  }

  @Get("products")
  products() {
    return this.admin.products();
  }

  @Post("products")
  async createProduct(@Body() body: CreateProductDto) {
    return { data: await this.admin.createProduct(body), message: "Product created" };
  }

  @Patch("products/:productId/status")
  async updateProductStatus(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Body() body: UpdateProductStatusDto
  ) {
    return {
      data: await this.admin.updateProductStatus(productId, body, user.id),
      message: "Product status updated"
    };
  }

  @Patch("categories/:categoryId/status")
  async updateCategoryStatus(
    @CurrentUser() user: RequestUser,
    @Param("categoryId") categoryId: string,
    @Body() body: UpdateCategoryStatusDto
  ) {
    return {
      data: await this.admin.updateCategoryStatus(categoryId, body, user.id),
      message: "Category status updated"
    };
  }

  @Get("support-tickets")
  supportTickets(@CurrentUser() user: RequestUser) {
    return this.admin.supportTickets(user.id);
  }

  @Get("support-tickets/:ticketId")
  supportTicketDetail(@Param("ticketId") ticketId: string) {
    return this.admin.supportTicketDetail(ticketId);
  }

  @Patch("support-tickets/:ticketId")
  async updateSupportTicket(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("ticketId") ticketId: string,
    @Body() body: UpdateSupportTicketDto
  ) {
    const updated = await this.admin.updateSupportTicket(ticketId, body, user.id);
    await this.eventBus.publish(
      "support.ticket_updated",
      {
        ticketId,
        status: updated.status,
        adminNote: updated.adminNote ?? undefined
      },
      eventMetadata("admin.controller", request)
    );
    return {
      data: updated,
      message: "Support ticket updated"
    };
  }

  @Get("audit-logs")
  auditLogs(@CurrentUser() user: RequestUser) {
    return this.admin.auditLogs(user.id);
  }

  @Get("payouts")
  payouts(@CurrentUser() user: RequestUser) {
    return this.admin.payouts(user.id);
  }

  @Idempotent("APPROVE_PAYOUT")
  @Post("payouts/:payoutId/approve")
  async approvePayout(
    @CurrentUser() user: RequestUser,
    @Param("payoutId") payoutId: string,
    @Body() body: ApprovePayoutDto
  ) {
    const payout = await this.admin.approvePayout(payoutId, body, user.id);
    return { data: payout, message: "Payout updated" };
  }

  @Get("categories")
  async listAllCategories() {
    return this.admin.listAllCategories();
  }

  @Post("categories")
  async createCategory(@CurrentUser() user: RequestUser, @Body() body: CreateCategoryDto) {
    return {
      data: await this.admin.createCategory(body, user.id),
      message: "Category created successfully"
    };
  }

  @Patch("categories/:categoryId")
  async updateCategory(
    @CurrentUser() user: RequestUser,
    @Param("categoryId") categoryId: string,
    @Body() body: UpdateCategoryDto
  ) {
    return {
      data: await this.admin.updateCategory(categoryId, body, user.id),
      message: "Category updated successfully"
    };
  }

  @Get("users")
  async listUsers(
    @Query("phone") phone?: string
  ) {
    return {
      data: await this.admin.listUsers(phone),
      message: "Users retrieved successfully"
    };
  }

  @Get("users/:userId")
  async getUser(
    @Param("userId") userId: string
  ) {
    return {
      data: await this.admin.getUser(userId),
      message: "User retrieved successfully"
    };
  }

  @Post("users/:userId/roles")
  async assignRole(
    @CurrentUser() user: RequestUser,
    @Param("userId") userId: string,
    @Body() body: AssignRoleDto
  ) {
    return {
      data: await this.admin.assignRole(userId, body.role, user.id),
      message: "Role assigned successfully"
    };
  }

  @Delete("users/:userId/roles/:role")
  async removeRole(
    @CurrentUser() user: RequestUser,
    @Param("userId") userId: string,
    @Param("role") role: string
  ) {
    return {
      data: await this.admin.removeRole(userId, role, user.id),
      message: "Role removed successfully"
    };
  }

  @Post("service-zones/:zoneId/pincodes")
  async addPincode(
    @CurrentUser() user: RequestUser,
    @Param("zoneId") zoneId: string,
    @Body() body: AddPincodeDto
  ) {
    return {
      data: await this.admin.addPincodeToZone(zoneId, body, user.id),
      message: "Pincode added successfully"
    };
  }

  @Delete("service-zones/:zoneId/pincodes/:pincode")
  async removePincode(
    @CurrentUser() user: RequestUser,
    @Param("zoneId") zoneId: string,
    @Param("pincode") pincode: string
  ) {
    return this.admin.removePincodeFromZone(zoneId, pincode, user.id);
  }

  @Roles("SUPER_ADMIN")
  @Post("zone-admins")
  async createZoneAdmin(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateZoneAdminDto
  ) {
    return {
      data: await this.admin.createZoneAdmin(body, user.id),
      message: "Zone Admin account created successfully"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("zone-assignments")
  async assignZoneAdmin(
    @CurrentUser() user: RequestUser,
    @Body() body: AssignZoneAdminDto
  ) {
    return {
      data: await this.admin.assignZoneAdmin(body, user.id),
      message: "Zone assigned successfully"
    };
  }

  @Roles("SUPER_ADMIN")
  @Delete("zone-assignments/:assignmentId")
  async revokeZoneAssignment(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string
  ) {
    return {
      data: await this.admin.revokeZoneAssignment(assignmentId, user.id),
      message: "Zone assignment revoked successfully"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("zone-assignments/:assignmentId/approve")
  async approveZoneAssignment(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string
  ) {
    return {
      data: await this.admin.approveZoneAssignment(assignmentId, user.id),
      message: "Zone Admin account approved successfully"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("zone-assignments/:assignmentId/reject")
  async rejectZoneAssignment(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string,
    @Body("reason") reason?: string
  ) {
    return {
      data: await this.admin.rejectZoneAssignment(assignmentId, user.id, reason),
      message: "Zone Admin account rejected"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("zone-assignments/:assignmentId/suspend")
  async suspendZoneAssignment(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string,
    @Body("reason") reason?: string
  ) {
    return {
      data: await this.admin.suspendZoneAssignment(assignmentId, user.id, reason),
      message: "Zone Admin account suspended"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("zone-assignments/:assignmentId/reactivate")
  async reactivateZoneAssignment(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string
  ) {
    return {
      data: await this.admin.reactivateZoneAssignment(assignmentId, user.id),
      message: "Zone Admin account reactivated"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("service-zones/:zoneId/deactivate")
  async deactivateServiceZone(
    @CurrentUser() user: RequestUser,
    @Param("zoneId") zoneId: string
  ) {
    return {
      data: await this.admin.deactivateServiceZone(zoneId, user.id),
      message: "Operational zone deactivated successfully"
    };
  }

  @Roles("SUPER_ADMIN")
  @Post("service-zones/:zoneId/reactivate")
  async reactivateServiceZone(
    @CurrentUser() user: RequestUser,
    @Param("zoneId") zoneId: string
  ) {
    return {
      data: await this.admin.reactivateServiceZone(zoneId, user.id),
      message: "Operational zone reactivated successfully"
    };
  }

  @Patch("partners/:partnerId/suspend")
  async suspendPartner(
    @CurrentUser() user: RequestUser,
    @Param("partnerId") partnerId: string,
    @Body() body: PartnerSuspensionDto
  ) {
    return {
      data: await this.admin.suspendPartner(partnerId, body.reason, user.id),
      message: "Partner suspended successfully"
    };
  }

  @Patch("partners/:partnerId/reinstate")
  async reinstatePartner(
    @CurrentUser() user: RequestUser,
    @Param("partnerId") partnerId: string,
    @Body() body: PartnerSuspensionDto
  ) {
    return {
      data: await this.admin.reinstatePartner(partnerId, body.reason, user.id),
      message: "Partner reinstated successfully"
    };
  }

  @Patch("partners/:partnerId/terminate")
  @Roles("ADMIN", "SUPER_ADMIN")
  async terminatePartner(
    @CurrentUser() user: RequestUser,
    @Param("partnerId") partnerId: string,
    @Body() body: PartnerSuspensionDto
  ) {
    return {
      data: await this.admin.terminatePartner(partnerId, body.reason, user.id),
      message: "Agreement terminated successfully"
    };
  }

  @Patch("vendors/:vendorId/suspension")
  async suspendVendor(
    @CurrentUser() user: RequestUser,
    @Param("vendorId") vendorId: string,
    @Body() body: PartnerSuspensionDto
  ) {
    return {
      data: await this.admin.togglePartnerSuspension("vendor", vendorId, body, user.id),
      message: body.status ? "Vendor suspended" : "Vendor reinstated"
    };
  }

  @Patch("riders/:riderId/suspension")
  async suspendRider(
    @CurrentUser() user: RequestUser,
    @Param("riderId") riderId: string,
    @Body() body: PartnerSuspensionDto
  ) {
    return {
      data: await this.admin.togglePartnerSuspension("rider", riderId, body, user.id),
      message: body.status ? "Rider suspended" : "Rider reinstated"
    };
  }

  @Post("vendors/:vendorId/offboard")
  @Roles("ADMIN", "SUPER_ADMIN")
  async offboardVendor(
    @CurrentUser() user: RequestUser,
    @Param("vendorId") vendorId: string
  ) {
    return {
      data: await this.admin.offboardPartner("vendor", vendorId, user.id),
      message: "Vendor offboarded"
    };
  }

  @Post("riders/:riderId/offboard")
  @Roles("ADMIN", "SUPER_ADMIN")
  async offboardRider(
    @CurrentUser() user: RequestUser,
    @Param("riderId") riderId: string
  ) {
    return {
      data: await this.admin.offboardPartner("rider", riderId, user.id),
      message: "Rider offboarded"
    };
  }

  @Roles("SUPER_ADMIN")
  @Get("zone-assignments")
  async listZoneAssignments() {
    return this.admin.listZoneAssignments();
  }
}
