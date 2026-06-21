import { Injectable } from "@nestjs/common";
import { ProductCategoryCode } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listVendors(filters: { category?: string; serviceZoneId?: string }) {
    return this.prisma.vendor.findMany({
      where: {
        isOpen: true,
        status: "APPROVED",
        ...(filters.category ? { categoryCode: filters.category as ProductCategoryCode } : {}),
        ...(filters.serviceZoneId ? { serviceZoneId: filters.serviceZoneId } : {})
      },
      orderBy: { shopName: "asc" },
      select: {
        id: true,
        shopName: true,
        categoryCode: true,
        addressLine: true,
        city: true,
        isOpen: true,
        commissionRate: true
      }
    });
  }

  vendorDetail(vendorId: string) {
    return this.prisma.vendor.findFirst({
      where: { id: vendorId, isOpen: true, status: "APPROVED" },
      include: {
        products: {
          where: { isApproved: true, isAvailable: true, category: { isActive: true } },
          include: {
            category: true,
            prices: {
              where: { isActive: true },
              orderBy: { effectiveOn: "desc" },
              take: 1
            }
          },
          orderBy: { name: "asc" }
        }
      }
    });
  }

  listProducts(filters: { vendorId?: string; categoryId?: string }) {
    return this.prisma.product.findMany({
      where: {
        isApproved: true,
        isAvailable: true,
        category: { isActive: true },
        vendor: { isOpen: true, status: "APPROVED" },
        ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {})
      },
      include: {
        vendor: { select: { id: true, shopName: true, isOpen: true } },
        category: true,
        prices: {
          where: { isActive: true },
          orderBy: { effectiveOn: "desc" },
          take: 1
        }
      },
      orderBy: { name: "asc" }
    });
  }
}
