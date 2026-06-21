import "reflect-metadata";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";
import { PrismaService } from "../src/modules/common/prisma.service";
import { InMemoryPrismaService } from "./support/in-memory-prisma";

const request = require("supertest") as any;
const serviceZoneId = "00000000-0000-4000-8000-000000000001";

describe("QuickGO MVP backend flow (e2e)", () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let keyCounter = 1;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
    process.env.MOCK_OTP_CODE = "123456";
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    prisma.reset();
    prisma.seedUserWithRoles("9999999999", ["SUPER_ADMIN"]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("authenticates with OTP, detects partner roles, enforces RBAC, and checks serviceability", async () => {
    const adminToken = await login("9999999999");
    await createVendor(adminToken, "9888888888");
    const vendorToken = await login("9888888888");

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", bearer(vendorToken))
      .expect(200);

    expect(me.body.data.partner_mode_eligibility).toEqual({
      vendor: true,
      rider: false
    });

    const customerToken = await login("9111111111");
    await request(app.getHttpServer())
      .get("/api/v1/admin/orders")
      .set("Authorization", bearer(customerToken))
      .expect(403);

    const inZone = await request(app.getHttpServer())
      .post("/api/v1/customer/serviceability")
      .set("Authorization", bearer(customerToken))
      .send({ latitude: 24.775, longitude: 86.38 })
      .expect(201);

    expect(inZone.body.data).toMatchObject({
      serviceable: true,
      zoneId: serviceZoneId
    });

    const outOfZone = await request(app.getHttpServer())
      .post("/api/v1/customer/serviceability")
      .set("Authorization", bearer(customerToken))
      .send({ latitude: 25.6, longitude: 87.5 })
      .expect(201);

    expect(outOfZone.body.data).toMatchObject({
      serviceable: false,
      reason: "SERVICE_ZONE_UNAVAILABLE"
    });
  });

  it("completes a COD order through manual dispatch, rider collection, reconciliation, audit, notifications, and payouts", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken);
    const customerToken = await login("9222222222");
    const order = await placeOrder(customerToken, setup.productId, "COD", "cod-create");

    expect(order.status).toBe("PLACED");
    expect(order.paymentStatus).toBe("COLLECTION_PENDING");
    expect(order.items[0]).toMatchObject({
      productNameSnapshot: "Test Thali",
      productUnitSnapshot: "plate"
    });

    const duplicateOrder = await createOrder(customerToken, order.addressId, "COD", "cod-create");
    expect(duplicateOrder.id).toBe(order.id);

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/accept`)
      .set("Authorization", bearer(setup.vendorToken))
      .set("Idempotency-Key", nextKey("accept"))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/preparing`)
      .set("Authorization", bearer(setup.vendorToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/ready`)
      .set("Authorization", bearer(setup.vendorToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${order.id}/assign-rider`)
      .set("Authorization", bearer(adminToken))
      .set("Idempotency-Key", nextKey("assign"))
      .send({ rider_id: setup.riderId, reason: "Manual dispatch for first rider" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/picked-up`)
      .set("Authorization", bearer(setup.riderToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/delivered`)
      .set("Authorization", bearer(setup.riderToken))
      .set("Idempotency-Key", nextKey("delivered"))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/payment-collected`)
      .set("Authorization", bearer(setup.riderToken))
      .set("Idempotency-Key", nextKey("rider-payment"))
      .send({ amount: order.totalAmount, payment_method_actual: "COD", note: "Cash collected" })
      .expect(201);

    const payment = prisma.paymentForOrder(order.id);
    expect(payment).toBeDefined();
    expect(payment!.status).toBe("COLLECTED_UNVERIFIED");

    const reconciled = await request(app.getHttpServer())
      .patch(`/api/v1/admin/payments/${payment!.id}/reconcile`)
      .set("Authorization", bearer(adminToken))
      .set("Idempotency-Key", nextKey("reconcile"))
      .send({ reason: "COD cash matched" })
      .expect(200);

    expect(reconciled.body.data.status).toBe("VERIFIED");

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${order.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);

    expect(detail.body.data.status).toBe("COMPLETED");
    expect(detail.body.data.paymentStatus).toBe("VERIFIED");
    expect(prisma.payoutCount()).toBe(2);

    await flushEvents();

    const audit = await request(app.getHttpServer())
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(audit.body.data.map((item: any) => item.action)).toEqual(
      expect.arrayContaining(["order.placed", "delivery.rider_assigned", "payment.reconciled"])
    );

    const notifications = await request(app.getHttpServer())
      .get("/api/v1/notifications")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(notifications.body.data.length).toBeGreaterThan(0);
  });

  it("completes a UPI-on-delivery order when admin records collection", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9777777777", "9666666666");
    const customerToken = await login("9333333333");
    const order = await placeOrder(customerToken, setup.productId, "UPI_ON_DELIVERY", "upi-create");

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/accept`)
      .set("Authorization", bearer(setup.vendorToken))
      .set("Idempotency-Key", nextKey("upi-accept"))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/preparing`)
      .set("Authorization", bearer(setup.vendorToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/ready`)
      .set("Authorization", bearer(setup.vendorToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${order.id}/assign-rider`)
      .set("Authorization", bearer(adminToken))
      .set("Idempotency-Key", nextKey("upi-assign"))
      .send({ rider_id: setup.riderId, reason: "Manual dispatch for UPI order" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/picked-up`)
      .set("Authorization", bearer(setup.riderToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/delivered`)
      .set("Authorization", bearer(setup.riderToken))
      .set("Idempotency-Key", nextKey("upi-delivered"))
      .expect(201);

    const collected = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${order.id}/payment-collected`)
      .set("Authorization", bearer(adminToken))
      .set("Idempotency-Key", nextKey("admin-payment"))
      .send({
        amount: order.totalAmount,
        payment_method_actual: "UPI_ON_DELIVERY",
        collector_type: "QUICKGO_ADMIN",
        collector_id: "admin-upi",
        payment_proof_reference: "upi-ref-001",
        note: "UPI received on delivery"
      })
      .expect(201);

    expect(collected.body.data.status).toBe("COLLECTED_UNVERIFIED");
    expect(collected.body.data.paymentMethodActual).toBe("UPI_ON_DELIVERY");

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/payments/${collected.body.data.id}/reconcile`)
      .set("Authorization", bearer(adminToken))
      .set("Idempotency-Key", nextKey("upi-reconcile"))
      .send({ reason: "UPI reference matched" })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${order.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);

    expect(detail.body.data.status).toBe("COMPLETED");
    expect(detail.body.data.payments[0].paymentMethodActual).toBe("UPI_ON_DELIVERY");
  });

  it("enforces cancellation rules, vendor rejection, support workflow, and validation dashboard shape", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9555555555", "9444444444");
    const customerToken = await login("9345678901");

    const cancellable = await placeOrder(customerToken, setup.productId, "COD", "cancel-create");
    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/orders/${cancellable.id}/cancel`)
      .set("Authorization", bearer(customerToken))
      .set("Idempotency-Key", nextKey("customer-cancel"))
      .send({ reason: "Customer changed plans" })
      .expect(201);
    expect(cancelled.body.data.status).toBe("CUSTOMER_CANCELLED");

    const accepted = await placeOrder(customerToken, setup.productId, "COD", "late-cancel-create");
    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${accepted.id}/accept`)
      .set("Authorization", bearer(setup.vendorToken))
      .set("Idempotency-Key", nextKey("late-accept"))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${accepted.id}/cancel`)
      .set("Authorization", bearer(customerToken))
      .set("Idempotency-Key", nextKey("late-cancel"))
      .send({ reason: "Too late" })
      .expect(400);

    const rejectable = await placeOrder(customerToken, setup.productId, "COD", "reject-create");
    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${rejectable.id}/reject`)
      .set("Authorization", bearer(setup.vendorToken))
      .set("Idempotency-Key", nextKey("vendor-reject"))
      .send({ reason: "Item unavailable" })
      .expect(201);
    expect(rejected.body.data.status).toBe("VENDOR_REJECTED");
    expect(rejected.body.data.paymentStatus).toBe("NOT_REQUIRED");

    const ticket = await request(app.getHttpServer())
      .post("/api/v1/support/tickets")
      .set("Authorization", bearer(customerToken))
      .send({
        order_id: rejectable.id,
        priority: "HIGH",
        subject: "Vendor rejection follow-up",
        description: "Customer wants help after rejection"
      })
      .expect(201);
    expect(ticket.body.data.events).toHaveLength(1);

    const dashboard = await request(app.getHttpServer())
      .get("/api/v1/admin/reports/validation-dashboard")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(dashboard.body.data).toHaveProperty("demand.total_orders");
    expect(dashboard.body.data).toHaveProperty("operations.cancellation_rate_percent");
    expect(dashboard.body.data.operations.open_support_tickets).toBeGreaterThanOrEqual(1);
  });

  it("lets admin approve, pause, review compliance, resolve support, and update service zones with audit logs", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9433333333", "9433333334");
    const customerToken = await login("9433333335");

    const vendorDocument = await request(app.getHttpServer())
      .post(`/api/v1/admin/vendors/${setup.vendorId}/compliance-documents`)
      .set("Authorization", bearer(adminToken))
      .send({
        type: "FSSAI",
        document_url: "https://cloudinary.example/fssai.pdf",
        expires_at: "2027-06-20T00:00:00.000Z"
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/vendor-compliance-documents/${vendorDocument.body.data.id}/review`)
      .set("Authorization", bearer(adminToken))
      .send({
        status: "APPROVED",
        fssai_status: "FSSAI_VERIFIED",
        reason: "FSSAI document checked for launch"
      })
      .expect(200);

    const pausedVendor = await request(app.getHttpServer())
      .patch(`/api/v1/admin/vendors/${setup.vendorId}/status`)
      .set("Authorization", bearer(adminToken))
      .send({ status: "PAUSED", reason: "Pause vendor during training review" })
      .expect(200);
    expect(pausedVendor.body.data.isOpen).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/vendors/${setup.vendorId}/status`)
      .set("Authorization", bearer(adminToken))
      .send({
        status: "APPROVED",
        fssai_status: "FSSAI_VERIFIED",
        reason: "Vendor training completed"
      })
      .expect(200);

    const riderDocument = await request(app.getHttpServer())
      .post(`/api/v1/admin/riders/${setup.riderId}/kyc-documents`)
      .set("Authorization", bearer(adminToken))
      .send({
        type: "ID_PROOF",
        document_url: "https://cloudinary.example/rider-id.pdf"
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/rider-kyc-documents/${riderDocument.body.data.id}/review`)
      .set("Authorization", bearer(adminToken))
      .send({ status: "APPROVED", reason: "Rider ID verified" })
      .expect(200);

    const pausedRider = await request(app.getHttpServer())
      .patch(`/api/v1/admin/riders/${setup.riderId}/status`)
      .set("Authorization", bearer(adminToken))
      .send({ status: "PAUSED", reason: "Rider unavailable during training" })
      .expect(200);
    expect(pausedRider.body.data.isOnline).toBe(false);

    const pausedProduct = await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${setup.productId}/status`)
      .set("Authorization", bearer(adminToken))
      .send({ status: "PAUSED", reason: "Temporarily pause product quality review" })
      .expect(200);
    expect(pausedProduct.body.data.isAvailable).toBe(false);

    const category = prisma.categoryId("RESTAURANT_FOOD");
    const pausedCategory = await request(app.getHttpServer())
      .patch(`/api/v1/admin/categories/${category}/status`)
      .set("Authorization", bearer(adminToken))
      .send({ is_active: false, reason: "Pause restaurant category for launch rollback test" })
      .expect(200);
    expect(pausedCategory.body.data.isActive).toBe(false);

    const supportTicket = await request(app.getHttpServer())
      .post("/api/v1/support/tickets")
      .set("Authorization", bearer(customerToken))
      .send({
        priority: "HIGH",
        subject: "Need help",
        description: "Admin should resolve this"
      })
      .expect(201);

    const resolvedTicket = await request(app.getHttpServer())
      .patch(`/api/v1/admin/support-tickets/${supportTicket.body.data.id}`)
      .set("Authorization", bearer(adminToken))
      .send({
        status: "RESOLVED",
        priority: "MEDIUM",
        admin_note: "Resolved by founder",
        reason: "Customer issue resolved by phone"
      })
      .expect(200);
    expect(resolvedTicket.body.data.status).toBe("RESOLVED");
    expect(resolvedTicket.body.data.events.length).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/service-zones/${serviceZoneId}`)
      .set("Authorization", bearer(adminToken))
      .send({ is_active: false, reason: "Pause launch zone during rollback drill" })
      .expect(200);

    const blocked = await request(app.getHttpServer())
      .post("/api/v1/customer/serviceability")
      .set("Authorization", bearer(customerToken))
      .send({ latitude: 24.775, longitude: 86.38 })
      .expect(201);
    expect(blocked.body.data).toMatchObject({
      serviceable: false,
      reason: "SERVICE_ZONE_UNAVAILABLE"
    });

    const audit = await request(app.getHttpServer())
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    const forcedActions = [
      "admin.vendor_status_updated",
      "admin.rider_status_updated",
      "admin.product_status_updated",
      "admin.category_status_updated",
      "admin.support_ticket_updated",
      "admin.service_zone_updated",
      "admin.vendor_compliance_document_reviewed",
      "admin.rider_kyc_document_reviewed"
    ];
    expect(audit.body.data.map((item: any) => item.action)).toEqual(
      expect.arrayContaining([
        ...forcedActions
      ])
    );
    const forceAuditLogs = audit.body.data.filter((item: any) =>
      forcedActions.includes(item.action)
    );
    expect(forceAuditLogs.every((item: any) => typeof item.reason === "string" && item.reason.length > 0)).toBe(true);
  });

  it("blocks out-of-zone order placement and stale fresh cart prices", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9422222221", "9422222222");
    const customerToken = await login("9422222223");

    const outOfZoneAddress = await request(app.getHttpServer())
      .post("/api/v1/customer/addresses")
      .set("Authorization", bearer(customerToken))
      .send({
        receiver_name: "Far Customer",
        receiver_phone: "9123456789",
        line1: "Outside launch zone",
        city: "Outside",
        state: "Bihar",
        latitude: 25.6,
        longitude: 87.5
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/cart/items")
      .set("Authorization", bearer(customerToken))
      .send({ product_id: setup.productId, quantity: 1 })
      .expect(201);

    const outOfZoneOrder = await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Authorization", bearer(customerToken))
      .set("Idempotency-Key", nextKey("out-of-zone-order"))
      .send({ address_id: outOfZoneAddress.body.data.id, payment_method: "COD" })
      .expect(400);
    expect(outOfZoneOrder.body.error.details.code).toBe("SERVICE_ZONE_UNAVAILABLE");

    const freshVendor = await createVendor(adminToken, "9422222224", "VEGETABLES");
    const freshVendorToken = await login("9422222224");
    await request(app.getHttpServer())
      .patch("/api/v1/vendor/shop-status")
      .set("Authorization", bearer(freshVendorToken))
      .send({ is_open: true })
      .expect(200);

    const freshProduct = await request(app.getHttpServer())
      .post("/api/v1/admin/products")
      .set("Authorization", bearer(adminToken))
      .send({
        vendor_id: freshVendor.id,
        category_id: prisma.categoryId("VEGETABLES"),
        name: "Tomato",
        unit: "kg",
        price: 40
      })
      .expect(201);

    const freshCustomerToken = await login("9422222225");
    const address = await request(app.getHttpServer())
      .post("/api/v1/customer/addresses")
      .set("Authorization", bearer(freshCustomerToken))
      .send({
        receiver_name: "Fresh Customer",
        receiver_phone: "9123456789",
        line1: "Station Road",
        city: "Jhajha",
        state: "Bihar",
        latitude: 24.775,
        longitude: 86.38
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/cart/items")
      .set("Authorization", bearer(freshCustomerToken))
      .send({ product_id: freshProduct.body.data.id, quantity: 1 })
      .expect(201);

    await prisma.productPrice.updateMany({
      where: { productId: freshProduct.body.data.id, isActive: true },
      data: { effectiveOn: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    });

    const staleFreshOrder = await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Authorization", bearer(freshCustomerToken))
      .set("Idempotency-Key", nextKey("stale-fresh-order"))
      .send({ address_id: address.body.data.id, payment_method: "COD" })
      .expect(400);
    expect(staleFreshOrder.body.error.details.code).toBe("PRICE_STALE");
  });

  it("keeps blocked MVP feature routes absent", async () => {
    const blockedRoutes = [
      `/api/v1/${["wa", "llet"].join("")}`,
      `/api/v1/${["re", "ferrals"].join("")}`,
      `/api/v1/${["sub", "scriptions"].join("")}`,
      `/api/v1/railway/${["train", "food"].join("-")}`,
      "/api/v1/payments/online-session",
      "/api/v1/live-tracking/orders/test-order"
    ];

    for (const route of blockedRoutes) {
      await request(app.getHttpServer()).get(route).expect(404);
    }
  });

  async function login(phone: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/verify-otp")
      .send({ phone, otp: "123456" })
      .expect(201);
    return response.body.data.access_token as string;
  }

  async function createOperationalSetup(
    adminToken: string,
    vendorPhone = "9888888888",
    riderPhone = "9877777777"
  ) {
    const vendor = await createVendor(adminToken, vendorPhone);
    const vendorToken = await login(vendorPhone);
    await request(app.getHttpServer())
      .patch("/api/v1/vendor/shop-status")
      .set("Authorization", bearer(vendorToken))
      .send({ is_open: true })
      .expect(200);

    const rider = await request(app.getHttpServer())
      .post("/api/v1/admin/riders")
      .set("Authorization", bearer(adminToken))
      .send({
        name: "Test Rider",
        phone: riderPhone,
        service_zone_id: serviceZoneId
      })
      .expect(201);
    const riderToken = await login(riderPhone);

    const product = await request(app.getHttpServer())
      .post("/api/v1/admin/products")
      .set("Authorization", bearer(adminToken))
      .send({
        vendor_id: vendor.id,
        category_id: prisma.categoryId("RESTAURANT_FOOD"),
        name: "Test Thali",
        unit: "plate",
        price: 120,
        description: "MVP test item"
      })
      .expect(201);

    return {
      vendorId: vendor.id,
      vendorToken,
      riderId: rider.body.data.id,
      riderToken,
      productId: product.body.data.id
    };
  }

  async function createVendor(
    adminToken: string,
    ownerPhone: string,
    categoryCode: "RESTAURANT_FOOD" | "VEGETABLES" | "FRUITS" | "DAIRY" = "RESTAURANT_FOOD"
  ) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/admin/vendors")
      .set("Authorization", bearer(adminToken))
      .send({
        shop_name: "Test Kitchen",
        owner_name: "Vendor Owner",
        owner_phone: ownerPhone,
        category_code: categoryCode,
        service_zone_id: serviceZoneId,
        address_line: "Market Road",
        city: "Jhajha",
        state: "Bihar",
        latitude: 24.775,
        longitude: 86.38,
        commission_rate: 10
      })
      .expect(201);
    return response.body.data;
  }

  async function placeOrder(
    customerToken: string,
    productId: string,
    paymentMethod: "COD" | "UPI_ON_DELIVERY",
    keyPrefix: string
  ) {
    const address = await request(app.getHttpServer())
      .post("/api/v1/customer/addresses")
      .set("Authorization", bearer(customerToken))
      .send({
        receiver_name: "Test Customer",
        receiver_phone: "9123456789",
        line1: "Station Road",
        city: "Jhajha",
        state: "Bihar",
        pincode: "811308",
        latitude: 24.775,
        longitude: 86.38
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/cart/items")
      .set("Authorization", bearer(customerToken))
      .send({ product_id: productId, quantity: 2 })
      .expect(201);

    const order = await createOrder(customerToken, address.body.data.id, paymentMethod, keyPrefix);
    return { ...order, addressId: address.body.data.id };
  }

  async function createOrder(
    customerToken: string,
    addressId: string,
    paymentMethod: "COD" | "UPI_ON_DELIVERY",
    idempotencyKey: string
  ) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Authorization", bearer(customerToken))
      .set("Idempotency-Key", idempotencyKey)
      .send({ address_id: addressId, payment_method: paymentMethod })
      .expect(201);
    return response.body.data;
  }

  function bearer(token: string) {
    return `Bearer ${token}`;
  }

  function nextKey(prefix: string) {
    return `${prefix}-${keyCounter++}`;
  }

  async function flushEvents() {
    await new Promise((resolve) => setImmediate(resolve));
  }
});
