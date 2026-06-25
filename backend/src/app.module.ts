import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtAuthGuard } from "./common/auth/jwt-auth.guard";
import { RolesGuard } from "./common/auth/roles.guard";
import { IdempotencyInterceptor } from "./common/idempotency/idempotency.interceptor";
import { validateEnvironment } from "./config/environment";
import { AdminModule } from "./modules/admin/admin.module";
import { AppVersionsModule } from "./modules/app-versions/app-versions.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CartsModule } from "./modules/carts/carts.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { CommonModule } from "./modules/common/common.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";
import { InternalEventsModule } from "./modules/internal-events/internal-events.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProductsModule } from "./modules/products/products.module";
import { ReconciliationModule } from "./modules/reconciliation/reconciliation.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { RidersModule } from "./modules/riders/riders.module";
import { ServiceZonesModule } from "./modules/service-zones/service-zones.module";
import { SettlementsModule } from "./modules/settlements/settlements.module";
import { SupportModule } from "./modules/support/support.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { UsersModule } from "./modules/users/users.module";
import { VendorsModule } from "./modules/vendors/vendors.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: 60000,
          limit: config.get<string>("NODE_ENV") === "test" ? 1000 : 60,
        },
      ],
    }),
    CommonModule,
    InternalEventsModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    VendorsModule,
    RidersModule,
    ServiceZonesModule,
    CategoriesModule,
    ProductsModule,
    CartsModule,
    OrdersModule,
    DeliveryModule,
    PaymentsModule,
    ReconciliationModule,
    SettlementsModule,
    NotificationsModule,
    SupportModule,
    ComplianceModule,
    UploadsModule,
    AuditModule,
    AdminModule,
    ReportsModule,
    AppVersionsModule,
    FeatureFlagsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor }
  ]
})
export class AppModule {}
