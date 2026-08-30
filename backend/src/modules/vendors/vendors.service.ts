import { Injectable, NotFoundException, BadRequestException, Inject, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { assertOrderTransition, OrderStatus } from "../orders/order-state.machine";
import { FILE_STORAGE, FileStorageService } from "../uploads/file-storage.service";
import {
  RejectOrderDto,
  ToggleShopStatusDto,
  UpdateProductAvailabilityDto,
  UpdateProductPriceDto,
  UpdateVendorProfileDto,
  UploadComplianceDocumentDto,
  VendorCreateProductDto,
  VendorUpdateProductDto,
  SubmitBankDetailsDto
} from "./vendor.dto";

import { DomainEventBus } from "../internal-events/domain-event-bus.service";

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBus,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorageService,
  ) {}

  async dashboard(userId: string) {
    const vendor = await this.vendorForUser(userId);
    const [newOrders, preparing, ready, todayOrders] = await Promise.all([
      this.prisma.order.count({ where: { vendorId: vendor.id, status: "PLACED" } }),
      this.prisma.order.count({ where: { vendorId: vendor.id, status: "PREPARING_OR_PACKING" } }),
      this.prisma.order.count({ where: { vendorId: vendor.id, status: "READY_FOR_PICKUP" } }),
      this.prisma.order.count({
        where: {
          vendorId: vendor.id,
          createdAt: { gte: this.startOfToday() }
        }
      })
    ]);

    return {
      vendor_id: vendor.id,
      shop_open: vendor.isOpen,
      new_orders: newOrders,
      preparing_or_packing: preparing,
      ready_for_pickup: ready,
      today_orders: todayOrders,
      today_earning_estimate: 0
    };
  }

  async toggleShop(userId: string, dto: ToggleShopStatusDto) {
    const vendor = await this.vendorForUser(userId);
    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: { isOpen: dto.is_open }
    });
  }

  async orders(userId: string) {
    const vendor = await this.vendorForUser(userId);
    return this.prisma.order.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      include: { items: true, history: true, payments: true },
      take: 100
    });
  }

  async acceptOrder(userId: string, orderId: string) {
    return this.updateOrderStatus(userId, orderId, "VENDOR_ACCEPTED", "Vendor accepted");
  }

  async rejectOrder(userId: string, orderId: string, dto: RejectOrderDto) {
    const vendor = await this.vendorForUser(userId);
    const order = await this.orderForVendor(vendor.id, orderId);
    assertOrderTransition(order.status as OrderStatus, "VENDOR_REJECTED");
    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "VENDOR_REJECTED",
        paymentStatus: "NOT_REQUIRED",
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
        payments: {
          updateMany: {
            where: { status: { in: ["PENDING", "PENDING_COLLECTION", "COLLECTION_PENDING"] } },
            data: { status: "NOT_REQUIRED" }
          }
        },
        history: {
          create: {
            fromStatus: order.status,
            toStatus: "VENDOR_REJECTED",
            actorId: userId,
            reason: dto.reason
          }
        }
      }
    });
  }

  markPreparing(userId: string, orderId: string) {
    return this.updateOrderStatus(userId, orderId, "PREPARING_OR_PACKING", "Vendor started preparing/packing");
  }

  markReady(userId: string, orderId: string) {
    return this.updateOrderStatus(userId, orderId, "READY_FOR_PICKUP", "Order ready for pickup");
  }

  async products(userId: string) {
    const vendor = await this.vendorForUser(userId);
    return this.prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: {
        category: true,
        prices: { orderBy: { effectiveOn: "desc" }, take: 1 }
      },
      orderBy: { name: "asc" }
    });
  }

  async updateAvailability(userId: string, productId: string, dto: UpdateProductAvailabilityDto) {
    const vendor = await this.vendorForUser(userId);
    await this.productForVendor(vendor.id, productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { isAvailable: dto.is_available }
    });
  }

  async updatePrice(userId: string, productId: string, dto: UpdateProductPriceDto) {
    const vendor = await this.vendorForUser(userId);
    const product = await this.productForVendor(vendor.id, productId);
    if (dto.price > dto.mrp) {
      throw new BadRequestException("Selling price must not exceed MRP");
    }
    await this.validateFreshRulesForProduct(product.categoryId, product.unit, dto.price, dto.mrp);

    await this.prisma.productPrice.updateMany({
      where: { productId, isActive: true },
      data: { isActive: false }
    });
    
    const productPrice = await this.prisma.productPrice.create({
      data: {
        productId,
        price: dto.price,
        mrp: dto.mrp,
        isActive: true
      }
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        mrp: dto.mrp,
        margin: dto.mrp - dto.price
      }
    });

    return productPrice;
  }

  async getProfile(userId: string) {
    const vendor = await this.vendorForUser(userId);
    const profile = await this.prisma.vendor.findUnique({
      where: { id: vendor.id },
      include: { serviceZone: true, documents: true }
    });
    if (!profile) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        partnerAvatarUrl: true,
        partnerAvatarUpdatedAt: true,
      }
    });

    const required = ["FSSAI", "GST", "PAN"];
    const approvedTypes = (profile.documents || [])
      .filter((doc: any) => doc.status === "APPROVED" && (!doc.expiresAt || new Date(doc.expiresAt) > new Date()))
      .map((doc: any) => doc.type);
    const documentsOk = required.every(t => approvedTypes.includes(t));

    const isVerified = (profile.status === "APPROVED" || profile.onboardingStatus === "APPROVED") &&
      profile.serviceZone?.isActive === true &&
      documentsOk;

    return {
      ...profile,
      user: user ? {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.partnerAvatarUrl || null,
        avatarUpdatedAt: user.partnerAvatarUpdatedAt
      } : null,
      isVerified
    };
  }

  async updateProfile(userId: string, dto: UpdateVendorProfileDto) {
    const vendor = await this.vendorForUser(userId);
    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        shopName: dto.shop_name,
        ownerName: dto.owner_name,
        addressLine: dto.address_line,
        city: dto.city,
        state: dto.state,
        latitude: dto.latitude,
        longitude: dto.longitude
      }
    });
  }

  async uploadDocument(userId: string, dto: UploadComplianceDocumentDto) {
    const vendor = await this.vendorForUser(userId);
    return this.prisma.vendorComplianceDocument.create({
      data: {
        vendorId: vendor.id,
        type: dto.type,
        documentUrl: dto.document_url,
        expiresAt: dto.expires_at ? new Date(dto.expires_at) : undefined,
        status: "PENDING"
      }
    });
  }

  async listDocuments(userId: string) {
    const vendor = await this.vendorForUser(userId);
    return this.prisma.vendorComplianceDocument.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" }
    });
  }

  async createProduct(userId: string, dto: VendorCreateProductDto) {
    const vendor = await this.vendorForUser(userId);
    const mrp = dto.mrp ?? dto.price;
    if (dto.price > mrp) {
      throw new BadRequestException("Selling price must not exceed MRP");
    }
    await this.validateFreshRulesForProduct(dto.category_id, dto.unit, dto.price, mrp, dto.freshness_status);

    return this.prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: dto.category_id,
        name: dto.name,
        unit: dto.unit,
        description: dto.description,
        imageUrl: dto.image_url,
        mrp,
        margin: mrp - dto.price,
        shelfLifeDays: dto.shelf_life_days,
        freshnessStatus: dto.freshness_status || "FRESH",
        isApproved: false,
        approvalStatus: "PENDING",
        prices: {
          create: {
            price: dto.price,
            mrp,
            isActive: true
          }
        }
      },
      include: { prices: true }
    });
  }

  async updateProduct(userId: string, productId: string, dto: VendorUpdateProductDto) {
    const vendor = await this.vendorForUser(userId);
    const product = await this.productForVendor(vendor.id, productId);

    const price = dto.price ?? Number(product.prices?.[0]?.price ?? 0);
    const mrp = dto.mrp ?? Number(product.mrp);

    if (price > mrp) {
      throw new BadRequestException("Selling price must not exceed MRP");
    }

    await this.validateFreshRulesForProduct(
      product.categoryId,
      dto.unit ?? product.unit,
      price,
      mrp,
      dto.freshness_status ?? product.freshnessStatus
    );

    const oldStorageKey = product.imageStorageKey;
    const shouldClearImage = dto.image_url === "";

    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      if (dto.price !== undefined || dto.mrp !== undefined) {
        await tx.productPrice.updateMany({
          where: { productId, isActive: true },
          data: { isActive: false }
        });
        await tx.productPrice.create({
          data: {
            productId,
            price,
            mrp,
            isActive: true
          }
        });
      }

      return tx.product.update({
        where: { id: productId },
        data: {
          name: dto.name ?? product.name,
          unit: dto.unit ?? product.unit,
          description: dto.description ?? product.description,
          imageUrl: shouldClearImage ? null : (dto.image_url ?? product.imageUrl),
          imageStorageKey: shouldClearImage ? null : product.imageStorageKey,
          imageMimeType: shouldClearImage ? null : product.imageMimeType,
          imageSizeBytes: shouldClearImage ? null : product.imageSizeBytes,
          imageUpdatedAt: shouldClearImage ? null : product.imageUpdatedAt,
          mrp,
          margin: mrp - price,
          shelfLifeDays: dto.shelf_life_days !== undefined ? dto.shelf_life_days : product.shelfLifeDays,
          freshnessStatus: dto.freshness_status ?? product.freshnessStatus
        }
      });
    });

    if (shouldClearImage && oldStorageKey) {
      try {
        await this.fileStorage.delete(oldStorageKey, "image");
      } catch (e) {
        console.error(`Failed to delete cleared product image file ${oldStorageKey}:`, e);
      }
    }

    return updatedProduct;
  }

  async deleteProduct(userId: string, productId: string) {
    const vendor = await this.vendorForUser(userId);
    await this.productForVendor(vendor.id, productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isAvailable: false }
    });
  }

  private async validateFreshRulesForProduct(
    categoryId: string,
    unit: string,
    price: number,
    mrp: number,
    freshnessStatus?: string
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      throw new BadRequestException("Category not found");
    }
    if (price > mrp) {
      throw new BadRequestException("Selling price must not exceed MRP");
    }
    if (category.isFresh) {
      const allowedUnits = ["kg", "g", "pcs", "bunch", "l", "packet"];
      if (!allowedUnits.includes(unit.toLowerCase())) {
        throw new BadRequestException(
          `Invalid unit for fresh category. Allowed: ${allowedUnits.join(", ")}`
        );
      }
      if (freshnessStatus) {
        const allowedFreshness = ["FRESH", "MEDIUM", "STALE"];
        if (!allowedFreshness.includes(freshnessStatus.toUpperCase())) {
          throw new BadRequestException(
            `Invalid freshness status. Allowed: ${allowedFreshness.join(", ")}`
          );
        }
      }
    }
  }

  private async updateOrderStatus(userId: string, orderId: string, status: "VENDOR_ACCEPTED" | "PREPARING_OR_PACKING" | "READY_FOR_PICKUP", reason: string) {
    const vendor = await this.vendorForUser(userId);
    const order = await this.orderForVendor(vendor.id, orderId);
    assertOrderTransition(order.status as OrderStatus, status);
    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        acceptedAt: status === "VENDOR_ACCEPTED" ? new Date() : order.acceptedAt,
        readyAt: status === "READY_FOR_PICKUP" ? new Date() : order.readyAt,
        history: {
          create: {
            fromStatus: order.status,
            toStatus: status,
            actorId: userId,
            reason
          }
        }
      }
    });
  }

  private async vendorForUser(userId: string) {
    const staff = await this.prisma.vendorStaff.findFirst({
      where: { userId },
      include: { vendor: true }
    });
    if (!staff) {
      throw new NotFoundException("Vendor profile not found for user");
    }
    const status = staff.vendor.status;
    if (status === "SUSPENDED" || status === "AGREEMENT_TERMINATED" || status === "OFFBOARDED" || status === "BLOCKED") {
      throw new ForbiddenException(`Vendor account status is ${status.toLowerCase()}. Access restricted.`);
    }
    return staff.vendor;
  }

  private async orderForVendor(vendorId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendorId }
    });
    if (!order) {
      throw new NotFoundException("Vendor order not found");
    }
    return order;
  }

  async updateBankDetails(userId: string, dto: SubmitBankDetailsDto) {
    const vendor = await this.vendorForUser(userId);
    const key = process.env.BANK_DETAILS_ENCRYPTION_KEY;
    if (!key) {
      throw new BadRequestException("Security Blocker: Bank details encryption key is not configured.");
    }
    
    const cryptoUtil = require("../../common/crypto.util");
    const encryptedAccountNumber = cryptoUtil.encryptAtRest(dto.account_number, key);
    
    const version = await this.prisma.bankDetailVersion.create({
      data: {
        vendorId: vendor.id,
        accountHolderName: dto.account_holder,
        accountNumber: encryptedAccountNumber,
        bankName: dto.bank_name,
        ifsc: dto.ifsc_code,
        branch: dto.branch_name,
        upiId: dto.upi_id,
        proofDocumentUrl: dto.document_url,
        status: "PENDING_REVIEW"
      }
    });

    await this.eventBus.publish(
      "compliance.bank_details_submitted",
      {
        versionId: version.id,
        partnerId: vendor.id,
        partnerType: "vendor"
      },
      { source: "vendors.service" }
    );

    return version;
  }

  private async productForVendor(vendorId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId },
      include: { prices: { where: { isActive: true }, take: 1 } }
    });
    if (!product) {
      throw new NotFoundException("Vendor product not found");
    }
    return product;
  }

  private startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
