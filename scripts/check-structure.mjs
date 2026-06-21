import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const requiredPaths = [
  "PRD.md",
  "docs/00_DOCUMENT_INDEX.md",
  "docs/03_DATABASE_SCHEMA.md",
  "docs/04_SYSTEM_DESIGN.md",
  "docs/05_API_SPEC.md",
  "docs/openapi.quickgo.mvp.v1.json",
  "backend/package.json",
  "backend/prisma/schema.prisma",
  "backend/src/app.module.ts",
  "backend/src/modules/internal-events/internal-events.module.ts",
  "backend/src/modules/internal-events/domain-event-bus.service.ts",
  "backend/src/modules/internal-events/domain-event.types.ts",
  "backend/src/modules/audit/audit-event.handler.ts",
  "backend/src/modules/notifications/notification-event.handler.ts",
  "backend/src/modules/orders/order-sla-event.handler.ts",
  "backend/src/modules/reconciliation/reconciliation-event.handler.ts",
  "backend/src/modules/auth/auth.controller.ts",
  "backend/src/modules/customers/customers.service.ts",
  "backend/src/modules/products/catalog.service.ts",
  "backend/src/modules/carts/carts.service.ts",
  "backend/src/modules/orders/orders.service.ts",
  "backend/src/modules/admin/admin.service.ts",
  "backend/src/modules/support/support.service.ts",
  "backend/src/modules/compliance/compliance.service.ts",
  "backend/src/modules/vendors/vendors.service.ts",
  "backend/src/modules/riders/riders.service.ts",
  "backend/src/modules/orders/order-state.machine.ts",
  "web/admin_panel/app/page.tsx",
  "mobile/customer_app/pubspec.yaml",
  "mobile/customer_app/lib/main.dart",
  "mobile/partner_app/pubspec.yaml",
  "mobile/partner_app/lib/main.dart",
  "mobile/packages/shared_api/lib/quickgo_api_client.dart"
];

for (const path of requiredPaths) {
  await access(join(process.cwd(), path));
}

const appModule = await readFile(join(process.cwd(), "backend/src/app.module.ts"), "utf8");
const requiredModules = [
  "AuthModule",
  "CustomersModule",
  "VendorsModule",
  "RidersModule",
  "OrdersModule",
  "AdminModule",
  "ReportsModule"
];

const missingModules = requiredModules.filter((module) => !appModule.includes(module));
if (missingModules.length > 0) {
  console.error(`Missing backend modules: ${missingModules.join(", ")}`);
  process.exit(1);
}

if (!appModule.includes("InternalEventsModule")) {
  console.error("Missing InternalEventsModule from backend app module.");
  process.exit(1);
}

console.log("QuickGO structure check passed.");
