import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module";
import { ServiceZonesModule } from "../service-zones/service-zones.module";
import { OrderSlaEventHandler } from "./order-sla-event.handler";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [CustomersModule, ServiceZonesModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderSlaEventHandler]
})
export class OrdersModule {}
