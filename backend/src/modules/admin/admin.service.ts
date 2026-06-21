import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import {
  CollectorType,
  ComplianceStatus,
  FssaiStatus,
  OnboardingStatus,
  PaymentMethod,
  PaymentStatus,
  ProductCategoryCode,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { assertOrderTransition, OrderStatus } from "../orders/order-state.machine";
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
  UpdateCategoryDto
} from "./admin.dto";

const PAYMENT_ATTENTION_STATUSES: PaymentStatus[] = [
  "PENDING",
  "PENDING_COLLECTION",
  "COLLECTION_PENDING",
  "COLLECTED",
  "COLLECTED_UNVERIFIED",
  "SHORT_COLLECTED",
  "OVER_COLLECTED",
  "DISPUTED"
];

const CANCELLATION_STATUSES: OrderStatus[] = [
  "CUSTOMER_CANCELLED",
  "VENDOR_REJECTED",
  "ADMIN_CANCELLED",
  "CANCELLED"
];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      pendingVendorAcceptance,
      readyForPickup,
      unassignedOrders,
      activeRiders,
      openSupportTickets,
      paymentPending,
      cancellationCount,
      todayEconomics
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: start } } }),
      this.prisma.order.count({ where: { status: "PLACED" } }),
      this.prisma.order.count({ where: { status: "READY_FOR_PICKUP" } }),
      this.prisma.order.count({
        where: {
          riderId: null,
          status: { in: ["VENDOR_ACCEPTED", "READY_FOR_PICKUP"] }
        }
      }),
      this.prisma.rider.count({ where: { isOnline: true, status: "APPROVED" } }),
      this.prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      this.prisma.payment.count({ where: { status: { in: PAYMENT_ATTENTION_STATUSES } } }),
      this.prisma.order.count({
        where: { createdAt: { gte: start }, status: { in: CANCELLATION_STATUSES } }
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start },
          status: { in: ["PAYMENT_COLLECTED", "COMPLETED"] }
        },
        _sum: {
          deliveryFee: true,
          commissionAmount: true
        }
      })
    ]);

    return {
      today_orders: todayOrders,
      pending_vendor_acceptance: pendingVendorAcceptance,
      ready_for_pickup: readyForPickup,
      unassigned_orders: unassignedOrders,
      active_riders: activeRiders,
      open_support_tickets: openSupportTickets,
      payment_pending: paymentPending,
      today_delivery_fee_collected: Number(todayEconomics._sum.deliveryFee ?? 0),
      today_vendor_commission: Number(todayEconomics._sum.commissionAmount ?? 0),
      today_rider_payout_estimate: Number(todayEconomics._sum.deliveryFee ?? 0),
      cancellation_count: cancellationCount,
      average_delivery_time_minutes: null,
      alerts: []
    };
  }

  orders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, shopName: true } },
        items: true,
        payments: true
      },
      take: 100
    });
  }

  async orderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        payments: true,
        collections: true,
        deliveryAssignments: true,
        supportTickets: true,
        slaEvents: true
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  async assignRider(orderId: string, dto: AssignRiderDto, actorId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.status !== "RIDER_ASSIGNED") {
      assertOrderTransition(order.status as OrderStatus, "RIDER_ASSIGNED");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.updateMany({
        where: { orderId, isActive: true },
        data: { isActive: false }
      });

      await tx.deliveryAssignment.create({
        data: {
          orderId,
          riderId: dto.rider_id,
          assignedBy: actorId ?? "admin"
        }
      });

      return tx.order.update({
        where: { id: orderId },
        data: {
          riderId: dto.rider_id,
          status: "RIDER_ASSIGNED",
          assignedAt: new Date(),
          history: {
            create: {
              fromStatus: order.status,
              toStatus: "RIDER_ASSIGNED",
              actorId,
              reason: dto.reason
            }
          }
        }
      });
    });
  }

  async cancelOrder(orderId: string, dto: AdminCancelOrderDto, actorId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    assertOrderTransition(order.status as OrderStatus, "ADMIN_CANCELLED");

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "ADMIN_CANCELLED",
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
            toStatus: "ADMIN_CANCELLED",
            actorId,
            reason: dto.reason
          }
        }
      }
    });
  }

  async reconcilePayment(paymentId: string, dto: ReconcilePaymentDto, actorId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const amountCollected = dto.amount_collected ?? Number(payment.amountCollected);
    const expectedAmount = Number(payment.amount);
    const targetStatus = dto.status ?? this.reconciliationStatus(amountCollected, expectedAmount);
    const verified = targetStatus === "VERIFIED" || targetStatus === "SETTLED";

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: targetStatus,
          amountCollected,
          adminVerificationStatus: verified ? "VERIFIED" : "PENDING",
          reconciledAt: new Date(),
          reconciledBy: actorId
        },
        include: { reconciliationEvents: { orderBy: { createdAt: "desc" } } }
      });

      await tx.paymentCollection.updateMany({
        where: { orderId: payment.orderId },
        data: {
          status: targetStatus,
          reconciledAt: new Date(),
          note: dto.reason
        }
      });

      await tx.paymentReconciliationEvent.create({
        data: {
          orderId: payment.orderId,
          paymentId,
          fromStatus: payment.status,
          toStatus: targetStatus,
          amount: amountCollected,
          note: dto.reason,
          createdBy: actorId
        }
      });

      if (verified && ["DELIVERED", "PAYMENT_COLLECTED"].includes(payment.order.status)) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: "COMPLETED",
            paymentStatus: targetStatus,
            completedAt: new Date(),
            history: {
              create: {
                fromStatus: payment.order.status,
                toStatus: "COMPLETED",
                actorId,
                reason: dto.reason
              }
            }
          }
        });
        await this.createPayoutRecords(tx, payment.orderId, actorId);
      } else {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: targetStatus }
        });
      }

      return updated;
    });
  }

  async markPaymentCollected(orderId: string, dto: MarkPaymentCollectedDto, actorId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    assertOrderTransition(order.status as OrderStatus, "PAYMENT_COLLECTED");

    const existingPayment = order.payments[0];
    const paymentMethodActual = (dto.payment_method_actual ??
      existingPayment?.paymentMethodRequested ??
      order.paymentMethod) as PaymentMethod;
    const collectorType = (dto.collector_type ?? "ADMIN") as CollectorType;
    const collectorId = dto.collector_id ?? actorId ?? "admin";

    return this.prisma.$transaction(async (tx) => {
      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              paymentMethodActual,
              collectorType,
              collectorId,
              status: "COLLECTED_UNVERIFIED",
              adminVerificationStatus: "PENDING",
              amountCollected: dto.amount,
              collectionTimestamp: new Date(),
              paymentProofReference: dto.payment_proof_reference
            }
          })
        : await tx.payment.create({
            data: {
              orderId,
              method: order.paymentMethod,
              paymentMethodRequested: order.paymentMethod,
              paymentMethodActual,
              collectorType,
              collectorId,
              status: "COLLECTED_UNVERIFIED",
              adminVerificationStatus: "PENDING",
              amount: order.totalAmount,
              amountCollected: dto.amount,
              collectionTimestamp: new Date(),
              paymentProofReference: dto.payment_proof_reference
            }
          });

      await tx.paymentCollection.create({
        data: {
          orderId,
          collectorType,
          collectorId,
          amount: dto.amount,
          status: "COLLECTED_UNVERIFIED",
          note: dto.note
        }
      });

      await tx.paymentReconciliationEvent.create({
        data: {
          orderId,
          paymentId: payment.id,
          fromStatus: existingPayment?.status ?? null,
          toStatus: "COLLECTED_UNVERIFIED",
          amount: dto.amount,
          note: dto.note ?? "Payment collected by admin",
          createdBy: actorId
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAYMENT_COLLECTED",
          paymentStatus: "COLLECTED_UNVERIFIED",
          history: {
            create: {
              fromStatus: order.status,
              toStatus: "PAYMENT_COLLECTED",
              actorId,
              reason: dto.note ?? "Payment collected"
            }
          }
        }
      });

      return payment;
    });
  }

  vendors() {
    return this.prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: { serviceZone: true, staff: { include: { user: true } } }
    });
  }

  createVendor(dto: CreateVendorDto) {
    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.upsert({
        where: { phone: dto.owner_phone },
        update: {},
        create: { phone: dto.owner_phone, status: "ACTIVE" }
      });
      const role = await tx.role.findUniqueOrThrow({ where: { code: "VENDOR_OWNER" } });
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: owner.id, roleId: role.id } },
        update: {},
        create: { userId: owner.id, roleId: role.id }
      });

      const vendor = await tx.vendor.create({
        data: {
          shopName: dto.shop_name,
          ownerName: dto.owner_name,
          ownerPhone: dto.owner_phone,
          categoryCode: dto.category_code,
          serviceZoneId: dto.service_zone_id,
          addressLine: dto.address_line,
          city: dto.city,
          state: dto.state,
          latitude: dto.latitude,
          longitude: dto.longitude,
          commissionRate: dto.commission_rate
        }
      });

      await tx.vendorStaff.create({
        data: {
          vendorId: vendor.id,
          userId: owner.id
        }
      });

      return vendor;
    });
  }

  async updateVendorStatus(
    vendorId: string,
    dto: UpdateVendorStatusDto,
    actorId?: string
  ) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const status = dto.status as OnboardingStatus;
    const data: Prisma.VendorUpdateInput = {
      status,
      onboardingStatus: status,
      ...(dto.fssai_status ? { fssaiStatus: dto.fssai_status as FssaiStatus } : {}),
      ...(status === "APPROVED" ? {} : { isOpen: false })
    };

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data,
      include: { serviceZone: true, staff: { include: { user: true } }, documents: true }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.vendor_status_updated",
      entityType: "vendor",
      entityId: vendorId,
      reason: dto.reason,
      metadata: { fromStatus: vendor.status, toStatus: dto.status, fssaiStatus: dto.fssai_status }
    });

    return updated;
  }

  riders() {
    return this.prisma.rider.findMany({
      orderBy: { createdAt: "desc" },
      include: { serviceZone: true, user: true }
    });
  }

  createRider(dto: CreateRiderDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { phone: dto.phone },
        update: {},
        create: { phone: dto.phone, status: "ACTIVE" }
      });
      const role = await tx.role.findUniqueOrThrow({ where: { code: "RIDER" } });
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id }
      });

      return tx.rider.create({
        data: {
          userId: user.id,
          name: dto.name,
          phone: dto.phone,
          serviceZoneId: dto.service_zone_id
        }
      });
    });
  }

  async updateRiderStatus(riderId: string, dto: UpdateRiderStatusDto, actorId?: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) {
      throw new NotFoundException("Rider not found");
    }

    const status = dto.status as OnboardingStatus;
    const updated = await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        status,
        onboardingStatus: status,
        ...(status === "APPROVED" ? {} : { isOnline: false })
      },
      include: { serviceZone: true, user: true, kycDocuments: true }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.rider_status_updated",
      entityType: "rider",
      entityId: riderId,
      reason: dto.reason,
      metadata: { fromStatus: rider.status, toStatus: dto.status }
    });

    return updated;
  }

  products() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, shopName: true } },
        category: true,
        prices: { orderBy: { effectiveOn: "desc" }, take: 1 }
      }
    });
  }

  createProduct(dto: CreateProductDto) {
    const mrp = dto.mrp ?? dto.price;
    if (dto.price > mrp) {
      throw new BadRequestException("Selling price must not exceed MRP");
    }
    return this.prisma.product.create({
      data: {
        vendorId: dto.vendor_id,
        categoryId: dto.category_id,
        name: dto.name,
        unit: dto.unit,
        description: dto.description,
        imageUrl: dto.image_url,
        mrp,
        margin: mrp - dto.price,
        shelfLifeDays: dto.shelf_life_days,
        freshnessStatus: dto.freshness_status || "FRESH",
        isApproved: true,
        approvalStatus: "APPROVED",
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

  async updateProductStatus(
    productId: string,
    dto: UpdateProductStatusDto,
    actorId?: string
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const status = dto.status as OnboardingStatus;
    const isApproved = status === "APPROVED";
    const shouldForceUnavailable = ["REJECTED", "PAUSED", "BLOCKED"].includes(status);
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: status,
        isApproved,
        isAvailable: shouldForceUnavailable ? false : dto.is_available ?? product.isAvailable,
        approvedBy: isApproved ? actorId : product.approvedBy
      },
      include: {
        vendor: { select: { id: true, shopName: true } },
        category: true,
        prices: { orderBy: { effectiveOn: "desc" }, take: 1 }
      }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.product_status_updated",
      entityType: "product",
      entityId: productId,
      reason: dto.reason,
      metadata: { fromStatus: product.approvalStatus, toStatus: dto.status }
    });

    return updated;
  }

  async updateCategoryStatus(
    categoryId: string,
    dto: UpdateCategoryStatusDto,
    actorId?: string
  ) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: { isActive: dto.is_active }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.category_status_updated",
      entityType: "category",
      entityId: categoryId,
      reason: dto.reason,
      metadata: { fromActive: category.isActive, toActive: dto.is_active }
    });

    return updated;
  }

  async createCategory(dto: CreateCategoryDto, actorId?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { code: dto.code }
    });
    if (existing) {
      throw new BadRequestException("Category code already exists");
    }

    const category = await this.prisma.category.create({
      data: {
        code: dto.code,
        name: dto.name,
        sortOrder: dto.sort_order,
        isFresh: dto.is_fresh,
        isActive: true
      }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.category_created",
      entityType: "category",
      entityId: category.id,
      reason: "Category created",
      metadata: { code: dto.code, name: dto.name }
    });

    return category;
  }

  async updateCategory(categoryId: string, dto: UpdateCategoryDto, actorId?: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name !== undefined ? dto.name : category.name,
        sortOrder: dto.sort_order !== undefined ? dto.sort_order : category.sortOrder,
        isFresh: dto.is_fresh !== undefined ? dto.is_fresh : category.isFresh
      }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.category_updated",
      entityType: "category",
      entityId: categoryId,
      reason: "Category updated",
      metadata: { fromName: category.name, toName: dto.name }
    });

    return updated;
  }

  async listAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: "asc" }
    });
  }

  supportTickets() {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: { events: true },
      take: 100
    });
  }

  async updateSupportTicket(
    ticketId: string,
    dto: UpdateSupportTicketDto,
    actorId?: string
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException("Support ticket not found");
    }

    const terminal = ["RESOLVED", "REJECTED", "CLOSED"].includes(dto.status);
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        priority: dto.priority ?? ticket.priority,
        adminNote: dto.admin_note ?? ticket.adminNote,
        acknowledgedAt:
          dto.status === "OPEN" ? ticket.acknowledgedAt : ticket.acknowledgedAt ?? new Date(),
        resolvedAt: terminal ? new Date() : null,
        events: {
          create: {
            actorId,
            message: `${dto.status}: ${dto.reason}`
          }
        }
      },
      include: { events: true }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.support_ticket_updated",
      entityType: "support_ticket",
      entityId: ticketId,
      reason: dto.reason,
      metadata: { fromStatus: ticket.status, toStatus: dto.status }
    });

    return updated;
  }

  listVendorComplianceDocuments(vendorId: string) {
    return this.prisma.vendorComplianceDocument.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createVendorComplianceDocument(
    vendorId: string,
    dto: CreateVendorComplianceDocumentDto,
    actorId?: string
  ) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const document = await this.prisma.vendorComplianceDocument.create({
      data: {
        vendorId,
        type: dto.type,
        documentUrl: dto.document_url,
        expiresAt: dto.expires_at ? new Date(dto.expires_at) : undefined
      }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.vendor_compliance_document_created",
      entityType: "vendor_compliance_document",
      entityId: document.id,
      reason: `Stored ${dto.type} document`,
      metadata: { vendorId, type: dto.type }
    });

    return document;
  }

  async reviewVendorComplianceDocument(
    documentId: string,
    dto: ReviewVendorComplianceDocumentDto,
    actorId?: string
  ) {
    const document = await this.prisma.vendorComplianceDocument.findUnique({
      where: { id: documentId }
    });
    if (!document) {
      throw new NotFoundException("Vendor compliance document not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorComplianceDocument.update({
        where: { id: documentId },
        data: { status: dto.status as ComplianceStatus }
      });

      if (dto.fssai_status) {
        await tx.vendor.update({
          where: { id: document.vendorId },
          data: { fssaiStatus: dto.fssai_status as FssaiStatus }
        });
      }

      await this.auditAdminAction({
        actorId,
        action: "admin.vendor_compliance_document_reviewed",
        entityType: "vendor_compliance_document",
        entityId: documentId,
        reason: dto.reason,
        metadata: {
          vendorId: document.vendorId,
          fromStatus: document.status,
          toStatus: dto.status,
          fssaiStatus: dto.fssai_status
        }
      });

      return updated;
    });
  }

  listRiderKycDocuments(riderId: string) {
    return this.prisma.riderKycDocument.findMany({
      where: { riderId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createRiderKycDocument(
    riderId: string,
    dto: CreateRiderKycDocumentDto,
    actorId?: string
  ) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) {
      throw new NotFoundException("Rider not found");
    }

    const document = await this.prisma.riderKycDocument.create({
      data: {
        riderId,
        type: dto.type,
        documentUrl: dto.document_url
      }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.rider_kyc_document_created",
      entityType: "rider_kyc_document",
      entityId: document.id,
      reason: `Stored ${dto.type} document`,
      metadata: { riderId, type: dto.type }
    });

    return document;
  }

  async reviewRiderKycDocument(
    documentId: string,
    dto: ReviewRiderKycDocumentDto,
    actorId?: string
  ) {
    const document = await this.prisma.riderKycDocument.findUnique({
      where: { id: documentId }
    });
    if (!document) {
      throw new NotFoundException("Rider KYC document not found");
    }

    const updated = await this.prisma.riderKycDocument.update({
      where: { id: documentId },
      data: { status: dto.status as ComplianceStatus }
    });

    await this.auditAdminAction({
      actorId,
      action: "admin.rider_kyc_document_reviewed",
      entityType: "rider_kyc_document",
      entityId: documentId,
      reason: dto.reason,
      metadata: { riderId: document.riderId, fromStatus: document.status, toStatus: dto.status }
    });

    return updated;
  }

  auditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }

  private auditAdminAction(input: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  private reconciliationStatus(amountCollected: number, expectedAmount: number): PaymentStatus {
    if (amountCollected < expectedAmount) {
      return "SHORT_COLLECTED";
    }
    if (amountCollected > expectedAmount) {
      return "OVER_COLLECTED";
    }
    return "VERIFIED";
  }

  private async createPayoutRecords(
    tx: Prisma.TransactionClient,
    orderId: string,
    actorId?: string
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { vendor: true }
    });
    if (!order) {
      return;
    }

    const vendorPayoutAmount = Math.max(
      Number(order.itemTotal) - Number(order.commissionAmount),
      0
    );
    const vendorNote = `Generated after payment reconciliation for order ${order.orderNumber}`;
    const existingVendorPayout = await tx.payout.findFirst({
      where: {
        payeeType: "VENDOR",
        vendorId: order.vendorId,
        adjustmentNote: vendorNote
      }
    });
    if (!existingVendorPayout) {
      await tx.payout.create({
        data: {
          payeeType: "VENDOR",
          vendorId: order.vendorId,
          status: "PAYOUT_PENDING",
          amount: vendorPayoutAmount,
          adjustmentNote: vendorNote,
          approvedBy: actorId
        }
      });
    }

    if (!order.riderId) {
      return;
    }

    const riderNote = `Generated after payment reconciliation for order ${order.orderNumber}`;
    const existingRiderPayout = await tx.payout.findFirst({
      where: {
        payeeType: "RIDER",
        riderId: order.riderId,
        adjustmentNote: riderNote
      }
    });
    if (!existingRiderPayout) {
      await tx.payout.create({
        data: {
          payeeType: "RIDER",
          riderId: order.riderId,
          status: "PAYOUT_PENDING",
          amount: Number(order.deliveryFee),
          adjustmentNote: riderNote,
          approvedBy: actorId
        }
      });
    }
  }
}
