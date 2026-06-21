import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { API_ERROR_CODES } from "../../common/constants";
import { CustomersService } from "../customers/customers.service";
import { PrismaService } from "../common/prisma.service";
import { isFreshPriceStale, pricesMatch } from "../products/fresh-price.policy";
import { ServiceZonesService } from "../service-zones/service-zones.service";
import { assertOrderTransition, canCustomerCancel, OrderStatus } from "./order-state.machine";
import { CancelOrderDto, CreateOrderDto } from "./order.dto";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly serviceZones: ServiceZonesService
  ) {}

  async createFromActiveCart(userId: string, dto: CreateOrderDto) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const profile = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customer.id },
      include: { user: { select: { id: true, phone: true } } }
    });
    const address = await this.prisma.address.findFirst({
      where: { id: dto.address_id, customerId: customer.id }
    });

    if (!address) {
      throw new NotFoundException("Delivery address not found");
    }

    const latitude = address.latitude === null ? null : Number(address.latitude);
    const longitude = address.longitude === null ? null : Number(address.longitude);
    if (latitude === null || longitude === null) {
      throw new BadRequestException({
        code: API_ERROR_CODES.SERVICE_ZONE_UNAVAILABLE,
        message: "Delivery address is not serviceable"
      });
    }

    const cart = await this.prisma.cart.findFirst({
      where: { customerId: customer.id, isActive: true },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: true,
                category: true,
                prices: {
                  where: { isActive: true },
                  orderBy: { effectiveOn: "desc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0 || !cart.vendorId) {
      throw new BadRequestException({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: "Cart is empty"
      });
    }

    const vendor = cart.items[0]?.product.vendor;
    if (!vendor || !vendor.isOpen) {
      throw new BadRequestException({
        code: API_ERROR_CODES.VENDOR_CLOSED,
        message: "Vendor is closed"
      });
    }

    if (vendor.status !== "APPROVED") {
      throw new BadRequestException({
        code: API_ERROR_CODES.VENDOR_CLOSED,
        message: "Vendor is not approved for orders"
      });
    }

    const serviceability = await this.serviceZones.checkServiceability({ latitude, longitude });
    if (!serviceability.serviceable || serviceability.zoneId !== vendor.serviceZoneId) {
      throw new BadRequestException({
        code: API_ERROR_CODES.SERVICE_ZONE_UNAVAILABLE,
        message: "Delivery address is outside the active service zone"
      });
    }

    for (const item of cart.items) {
      const activePrice = item.product.prices[0];
      if (
        !item.product.isApproved ||
        !item.product.isAvailable ||
        !item.product.category.isActive ||
        !activePrice
      ) {
        throw new BadRequestException({
          code: API_ERROR_CODES.PRODUCT_UNAVAILABLE,
          message: `${item.product.name} is unavailable`
        });
      }

      if (!pricesMatch(item.unitPrice, activePrice.price)) {
        throw new BadRequestException({
          code: API_ERROR_CODES.PRICE_STALE,
          message: `${item.product.name} price changed. Please refresh cart before ordering.`
        });
      }

      if (item.product.category.isFresh && isFreshPriceStale(activePrice.effectiveOn)) {
        throw new BadRequestException({
          code: API_ERROR_CODES.PRICE_STALE,
          message: `${item.product.name} fresh price is stale`
        });
      }
    }

    const itemTotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );
    const deliveryFee = 0;
    const platformFee = 0;
    const discountAmount = 0;
    const totalAmount = itemTotal + deliveryFee + platformFee - discountAmount;
    const commissionRateSnapshot = Number(vendor.commissionRate);
    const commissionAmount = Number(((itemTotal * commissionRateSnapshot) / 100).toFixed(2));
    const orderNumber = `QG-${Date.now()}`;
    const paymentMethod = dto.payment_method as PaymentMethod;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          vendorId: vendor.id,
          serviceZoneId: vendor.serviceZoneId,
          status: "PLACED",
          paymentMethod,
          paymentStatus: "COLLECTION_PENDING",
          itemTotal,
          deliveryFee,
          platformFee,
          discountAmount,
          totalAmount,
          commissionRateSnapshot,
          commissionAmount,
          customerSnapshot: {
            id: profile.id,
            name: profile.name,
            phone: profile.user.phone
          },
          vendorSnapshot: {
            id: vendor.id,
            shopName: vendor.shopName,
            ownerPhone: vendor.ownerPhone,
            addressLine: vendor.addressLine
          },
          deliveryAddressSnapshot: {
            receiverName: address.receiverName,
            receiverPhone: address.receiverPhone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            latitude,
            longitude
          },
          paymentSnapshot: {
            requestedMethod: paymentMethod,
            status: "COLLECTION_PENDING",
            collectionModel: "COD_OR_UPI_ON_DELIVERY"
          },
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productSnapshot: {
                id: item.product.id,
                name: item.product.name,
                unit: item.product.unit,
                category: item.product.category.code
              },
              productNameSnapshot: item.product.name,
              productUnitSnapshot: item.product.unit,
              unitPriceSnapshot: item.unitPrice,
              quantity: item.quantity,
              orderedQuantity: item.quantity,
              fulfilledQuantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: Number(item.unitPrice) * item.quantity
            }))
          },
          history: {
            create: {
              toStatus: "PLACED",
              reason: dto.customer_note
            }
          },
          payments: {
            create: {
              method: paymentMethod,
              paymentMethodRequested: paymentMethod,
              status: "COLLECTION_PENDING",
              adminVerificationStatus: "PENDING",
              amount: totalAmount
            }
          }
        },
        include: {
          items: true,
          history: true,
          payments: true
        }
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { isActive: false }
      });

      return order;
    });
  }

  async listMine(userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    return this.prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, shopName: true } },
        items: true
      }
    });
  }

  async detail(userId: string, orderId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id },
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        payments: true,
        collections: true,
        supportTickets: true
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      ...order,
      can_customer_cancel: canCustomerCancel(order.status as OrderStatus)
    };
  }

  async cancel(userId: string, orderId: string, dto: CancelOrderDto) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!canCustomerCancel(order.status as OrderStatus)) {
      throw new BadRequestException({
        code: API_ERROR_CODES.ORDER_STATE_INVALID,
        message: "Customer can cancel only before vendor acceptance"
      });
    }

    const reason = dto.reason ?? "Customer requested cancellation";
    assertOrderTransition(order.status as OrderStatus, "CUSTOMER_CANCELLED");
    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CUSTOMER_CANCELLED",
        paymentStatus: "NOT_REQUIRED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        payments: {
          updateMany: {
            where: { status: { in: ["PENDING", "PENDING_COLLECTION", "COLLECTION_PENDING"] } },
            data: { status: "NOT_REQUIRED" }
          }
        },
        history: {
          create: {
            fromStatus: order.status,
            toStatus: "CUSTOMER_CANCELLED",
            reason
          }
        }
      },
      include: { history: true }
    });
  }
}
