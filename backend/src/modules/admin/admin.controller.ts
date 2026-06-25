import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
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
  UpdateCategoryStatusDto,
  UpdateProductStatusDto,
  UpdateRiderStatusDto,
  UpdateSupportTicketDto,
  UpdateVendorStatusDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ApprovePayoutDto
} from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@Roles("ADMIN", "SUPER_ADMIN")
export class AdminController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly admin: AdminService
  ) {}

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("attention-queue")
  attentionQueue() {
    return this.admin.attentionQueue();
  }

  @Get(["reconciliation-alerts", "reconciliation/alerts"])
  reconciliationAlerts() {
    return this.admin.reconciliationAlerts();
  }

  @Get("reconciliation/summary")
  reconciliationSummary() {
    return this.admin.reconciliationSummary();
  }

  @Get("payments")
  allPayments() {
    return this.admin.allPayments();
  }

  @Get("orders")
  orders() {
    return this.admin.orders();
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
  vendors() {
    return this.admin.vendors();
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

  @Get("riders")
  riders() {
    return this.admin.riders();
  }

  @Get("rider-operations")
  riderOperations() {
    return this.admin.riderOperations();
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
  supportTickets() {
    return this.admin.supportTickets();
  }

  @Get("support-tickets/:ticketId")
  supportTicketDetail(@Param("ticketId") ticketId: string) {
    return this.admin.supportTicketDetail(ticketId);
  }

  @Patch("support-tickets/:ticketId")
  async updateSupportTicket(
    @CurrentUser() user: RequestUser,
    @Param("ticketId") ticketId: string,
    @Body() body: UpdateSupportTicketDto
  ) {
    return {
      data: await this.admin.updateSupportTicket(ticketId, body, user.id),
      message: "Support ticket updated"
    };
  }

  @Get("audit-logs")
  auditLogs() {
    return this.admin.auditLogs();
  }

  @Get("payouts")
  payouts() {
    return this.admin.payouts();
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
}
