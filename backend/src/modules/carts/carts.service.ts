import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { API_ERROR_CODES } from "../../common/constants";
import { CustomersService } from "../customers/customers.service";
import { PrismaService } from "../common/prisma.service";
import { isFreshPriceStale } from "../products/fresh-price.policy";
import { AddCartItemDto, UpdateCartItemDto } from "./cart.dto";

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService
  ) {}

  async getActiveCart(userId: string) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const cart = await this.ensureActiveCart(customer.id);
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: { select: { id: true, shopName: true } },
                category: true
              }
            }
          }
        }
      }
    });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: dto.product_id },
      include: {
        category: true,
        prices: {
          where: { isActive: true },
          orderBy: { effectiveOn: "desc" },
          take: 1
        }
      }
    });

    if (!product || !product.isApproved || !product.isAvailable || !product.category.isActive) {
      throw new BadRequestException({
        code: API_ERROR_CODES.PRODUCT_UNAVAILABLE,
        message: "Product is unavailable"
      });
    }

    const price = product.prices[0];
    if (!price) {
      throw new BadRequestException({
        code: API_ERROR_CODES.PRICE_STALE,
        message: "Product price is not active"
      });
    }

    if (product.category.isFresh && isFreshPriceStale(price.effectiveOn)) {
      throw new BadRequestException({
        code: API_ERROR_CODES.PRICE_STALE,
        message: "Fresh product price must be updated before ordering"
      });
    }

    const cart = await this.ensureActiveCart(customer.id);
    if (cart.vendorId && cart.vendorId !== product.vendorId) {
      throw new BadRequestException({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: "Cart can contain products from only one vendor"
      });
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { vendorId: product.vendorId }
    });

    return this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: product.id
        }
      },
      update: {
        quantity: { increment: dto.quantity },
        unitPrice: price.price
      },
      create: {
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
        unitPrice: price.price
      }
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getActiveCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id }
    });

    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return { deleted: true };
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity }
    });
  }

  async clear(userId: string) {
    const cart = await this.getActiveCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.prisma.cart.update({
      where: { id: cart.id },
      data: { vendorId: null }
    });
  }

  private async ensureActiveCart(customerId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { customerId, isActive: true }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({ data: { customerId } });
  }

}
