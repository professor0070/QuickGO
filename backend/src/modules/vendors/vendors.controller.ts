import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { eventMetadata } from "../../common/http/request-metadata";
import { Idempotent } from "../../common/idempotency/idempotent.decorator";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import {
  RejectOrderDto,
  ToggleShopStatusDto,
  UpdateProductAvailabilityDto,
  UpdateProductPriceDto,
  UpdateVendorProfileDto,
  UploadComplianceDocumentDto,
  VendorCreateProductDto,
  VendorUpdateProductDto
} from "./vendor.dto";
import { VendorsService } from "./vendors.service";

@Controller("vendor")
@Roles("VENDOR_OWNER", "VENDOR_STAFF")
export class VendorsController {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly vendorsService: VendorsService
  ) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: RequestUser) {
    return this.vendorsService.dashboard(user.id);
  }

  @Patch("shop-status")
  async toggleShop(@CurrentUser() user: RequestUser, @Body() body: ToggleShopStatusDto) {
    return {
      data: await this.vendorsService.toggleShop(user.id, body),
      message: "Shop status updated"
    };
  }

  @Get("orders")
  orders(@CurrentUser() user: RequestUser) {
    return this.vendorsService.orders(user.id);
  }

  @Idempotent("ACCEPT_ORDER")
  @Post("orders/:orderId/accept")
  async acceptOrder(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    const order = await this.vendorsService.acceptOrder(user.id, orderId);
    await this.eventBus.publish(
      "vendor.order_accepted",
      { orderId },
      eventMetadata("vendors.controller", request)
    );
    return order;
  }

  @Idempotent("REJECT_ORDER")
  @Post("orders/:orderId/reject")
  async rejectOrder(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string,
    @Body() body: RejectOrderDto
  ) {
    const order = await this.vendorsService.rejectOrder(user.id, orderId, body);
    await this.eventBus.publish(
      "vendor.order_rejected",
      { orderId, reason: body.reason },
      eventMetadata("vendors.controller", request)
    );
    return order;
  }

  @Post("orders/:orderId/preparing")
  async markPreparing(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    const order = await this.vendorsService.markPreparing(user.id, orderId);
    await this.eventBus.publish(
      "vendor.order_preparing",
      { orderId },
      eventMetadata("vendors.controller", request)
    );
    return order;
  }

  @Post("orders/:orderId/ready")
  async markReady(
    @Req() request: Request,
    @CurrentUser() user: RequestUser,
    @Param("orderId") orderId: string
  ) {
    const order = await this.vendorsService.markReady(user.id, orderId);
    await this.eventBus.publish(
      "vendor.order_ready_for_pickup",
      { orderId },
      eventMetadata("vendors.controller", request)
    );
    return order;
  }

  @Get("products")
  products(@CurrentUser() user: RequestUser) {
    return this.vendorsService.products(user.id);
  }

  @Patch("products/:productId/availability")
  updateAvailability(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Body() body: UpdateProductAvailabilityDto
  ) {
    return this.vendorsService.updateAvailability(user.id, productId, body);
  }

  @Patch("products/:productId/price")
  updatePrice(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Body() body: UpdateProductPriceDto
  ) {
    return this.vendorsService.updatePrice(user.id, productId, body);
  }

  @Get("profile")
  getProfile(@CurrentUser() user: RequestUser) {
    return this.vendorsService.getProfile(user.id);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() user: RequestUser, @Body() body: UpdateVendorProfileDto) {
    return this.vendorsService.updateProfile(user.id, body);
  }

  @Post("compliance-documents")
  uploadDocument(@CurrentUser() user: RequestUser, @Body() body: UploadComplianceDocumentDto) {
    return this.vendorsService.uploadDocument(user.id, body);
  }

  @Get("compliance-documents")
  listDocuments(@CurrentUser() user: RequestUser) {
    return this.vendorsService.listDocuments(user.id);
  }

  @Post("products")
  createProduct(@CurrentUser() user: RequestUser, @Body() body: VendorCreateProductDto) {
    return this.vendorsService.createProduct(user.id, body);
  }

  @Patch("products/:productId")
  updateProduct(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Body() body: VendorUpdateProductDto
  ) {
    return this.vendorsService.updateProduct(user.id, productId, body);
  }

  @Delete("products/:productId")
  deleteProduct(@CurrentUser() user: RequestUser, @Param("productId") productId: string) {
    return this.vendorsService.deleteProduct(user.id, productId);
  }
}
