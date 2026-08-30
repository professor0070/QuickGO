import { Controller, Get, Param, Query } from "@nestjs/common";
import { Public } from "../../common/auth/public.decorator";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get("vendors")
  vendors(@Query("category") category?: string, @Query("service_zone_id") serviceZoneId?: string) {
    return this.catalog.listVendors({ category, serviceZoneId });
  }

  @Public()
  @Get("vendors/:vendorId")
  vendorDetail(@Param("vendorId") vendorId: string) {
    return this.catalog.vendorDetail(vendorId);
  }

  @Public()
  @Get("products")
  products(
    @Query("vendor_id") vendorId?: string,
    @Query("category_id") categoryId?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.catalog.listProducts({
      vendorId,
      categoryId,
      search,
      limit: parsedLimit,
      cursor,
    });
  }
}

