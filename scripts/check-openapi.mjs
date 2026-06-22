import { readFile } from "node:fs/promises";
import { join } from "node:path";

const specPath = join(process.cwd(), "docs", "openapi.quickgo.mvp.v1.json");
const spec = JSON.parse(await readFile(specPath, "utf8"));

const requiredTopLevel = ["openapi", "info", "servers", "paths", "components"];
const requiredPaths = [
  "/system/health",
  "/system/version",
  "/system/feature-flags",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/me",
  "/customer/profile",
  "/customer/addresses",
  "/customer/serviceability",
  "/catalog/categories",
  "/catalog/vendors",
  "/catalog/products",
  "/cart",
  "/orders",
  "/vendor/dashboard",
  "/rider/dashboard",
  "/rider/profile",
  "/rider/kyc-documents",
  "/support/tickets",
  "/rider/order-history",
  "/rider/orders/{orderId}/accept",
  "/rider/orders/{orderId}/reject",
  "/rider/orders/{orderId}/delivery-proof",
  "/admin/dashboard",
  "/admin/attention-queue",
  "/admin/reconciliation-alerts",
  "/admin/rider-operations",
  "/admin/orders",
  "/admin/vendors",
  "/admin/riders",
  "/admin/products",
  "/admin/products/{productId}/image",
  "/admin/vendors/{vendorId}/compliance-documents/upload",
  "/admin/riders/{riderId}/kyc-documents/upload",
  "/admin/service-zones",
  "/admin/reports/validation-dashboard"
];

const errors = [];

for (const key of requiredTopLevel) {
  if (!spec[key]) {
    errors.push(`Missing top-level OpenAPI key: ${key}`);
  }
}

if (typeof spec.openapi !== "string" || !spec.openapi.startsWith("3.")) {
  errors.push("OpenAPI version must be 3.x");
}

for (const path of requiredPaths) {
  if (!spec.paths?.[path]) {
    errors.push(`Missing required API path: ${path}`);
  }
}

if (!spec.components?.securitySchemes?.bearerAuth) {
  errors.push("Missing bearerAuth security scheme");
}

const operationIds = new Set();
for (const path of Object.values(spec.paths ?? {})) {
  for (const operation of Object.values(path)) {
    const operationId = operation?.operationId;
    if (!operationId) {
      continue;
    }
    if (operationIds.has(operationId)) {
      errors.push(`Duplicate operationId: ${operationId}`);
    }
    operationIds.add(operationId);
  }
}

if (errors.length > 0) {
  console.error("OpenAPI contract check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("OpenAPI contract check passed.");
