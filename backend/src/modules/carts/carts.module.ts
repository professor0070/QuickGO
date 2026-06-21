import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { CartsController } from "./carts.controller";
import { CartsService } from "./carts.service";

@Module({
  imports: [CustomersModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService]
})
export class CartsModule {}
