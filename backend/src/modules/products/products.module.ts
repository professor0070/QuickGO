import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { ProductsController } from "./products.controller";

@Module({
  controllers: [ProductsController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class ProductsModule {}
