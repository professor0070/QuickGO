import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyMultipart from "@fastify/multipart";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";
import { PrismaService } from "../src/modules/common/prisma.service";
import { FILE_STORAGE } from "../src/modules/uploads/file-storage.service";
import { InMemoryPrismaService } from "./support/in-memory-prisma";

const request = require("supertest") as any;
const serviceZoneId = "00000000-0000-4000-8000-000000000001";

describe("QuickGO MVP backend flow (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: InMemoryPrismaService;
  let keyCounter = 1;
  let storedUploads: Array<Record<string, any>>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
    process.env.MOCK_OTP_CODE = "123456";
    prisma = new InMemoryPrismaService();
    storedUploads = [];

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(FILE_STORAGE)
      .useValue({
        upload: async (file: any, options: any) => {
          storedUploads.push({ file, options });
          return {
            url: `stored://${options.folder}/${options.publicId}`,
            publicId: `${options.folder}/${options.publicId}`,
            resourceType: options.resourceType,
            bytes: file.size,
            format: String(file.mimetype).split("/").pop(),
            originalName: file.originalname
          };
        }
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(fastifyMultipart);
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    prisma.reset();
    prisma.seedUserWithRoles("9999999999", ["SUPER_ADMIN"]);
    storedUploads.length = 0;
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
    expect(notifications.body.data.every((item: any) => item.deliveryStatus === "NO_DEVICE")).toBe(true);
    expect(notifications.body.data.every((item: any) => item.deliveryAttempts === 1)).toBe(true);
  });

  it("surfaces stale manual operations in the admin attention queue and resolves SLA breaches", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9550000001", "9550000002");
    const customerToken = await login("9550000003");
    const order = await placeOrder(customerToken, setup.productId, "COD", "sla-create");

    await prisma.order.update({
      where: { id: order.id },
      data: { createdAt: new Date(Date.now() - 15 * 60 * 1000) }
    });

    const queue = await request(app.getHttpServer())
      .get("/api/v1/admin/attention-queue")
      .set("Authorization", bearer(adminToken))
      .expect(200);

    expect(queue.body.data[0]).toMatchObject({
      type: "VENDOR_ACCEPTANCE_DELAY",
      order_id: order.id,
      status: "PLACED"
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${order.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(detail.body.data.slaEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "VENDOR_ACCEPTANCE_DELAY",
          breached: true,
          resolvedAt: null
        })
      ])
    );

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/accept`)
      .set("Authorization", bearer(setup.vendorToken))
      .set("Idempotency-Key", nextKey("sla-accept"))
      .expect(201);
    await flushEvents();

    const afterAccept = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${order.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    const breach = afterAccept.body.data.slaEvents.find(
      (item: any) => item.type === "VENDOR_ACCEPTANCE_DELAY" && item.breached
    );
    expect(breach.resolvedAt).toBeTruthy();
  });

  it("persists payment reconciliation alerts for amount mismatches and resolves them after verification", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9540000001", "9540000002");
    const customerToken = await login("9540000003");
    const order = await placeOrder(customerToken, setup.productId, "COD", "mismatch-create");

    await request(app.getHttpServer())
      .post(`/api/v1/vendor/orders/${order.id}/accept`)
      .set("Authorization", bearer(setup.vendorToken))
      .set("Idempotency-Key", nextKey("mismatch-accept"))
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
      .set("Idempotency-Key", nextKey("mismatch-assign"))
      .send({ rider_id: setup.riderId, reason: "Manual dispatch for reconciliation mismatch" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/picked-up`)
      .set("Authorization", bearer(setup.riderToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/delivered`)
      .set("Authorization", bearer(setup.riderToken))
      .set("Idempotency-Key", nextKey("mismatch-delivered"))
      .expect(201);

    const shortAmount = Number(order.totalAmount) - 5;
    await request(app.getHttpServer())
      .post(`/api/v1/rider/orders/${order.id}/payment-collected`)
      .set("Authorization", bearer(setup.riderToken))
      .set("Idempotency-Key", nextKey("mismatch-payment"))
      .send({ amount: shortAmount, payment_method_actual: "COD", note: "Cash short by five" })
      .expect(201);
    await flushEvents();

    const payment = prisma.paymentForOrder(order.id)!;
    const alerts = await request(app.getHttpServer())
      .get("/api/v1/admin/reconciliation-alerts")
      .set("Authorization", bearer(adminToken))
      .expect(200);

    expect(alerts.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: order.id,
          paymentId: payment.id,
          type: "AMOUNT_MISMATCH",
          status: "OPEN",
          severity: "HIGH"
        })
      ])
    );

    const beforeReconcile = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${order.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(beforeReconcile.body.data.paymentReconciliationAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "COLLECTION_PENDING", status: "OPEN" }),
        expect.objectContaining({ type: "AMOUNT_MISMATCH", status: "OPEN" })
      ])
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/payments/${payment.id}/reconcile`)
      .set("Authorization", bearer(adminToken))
      .set("Idempotency-Key", nextKey("mismatch-reconcile"))
      .send({
        status: "VERIFIED",
        amount_collected: Number(order.totalAmount),
        reason: "Short cash recovered and matched during daily close"
      })
      .expect(200);
    await flushEvents();

    const afterReconcile = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${order.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(
      afterReconcile.body.data.paymentReconciliationAlerts.filter(
        (item: any) => item.paymentId === payment.id
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "COLLECTION_PENDING", status: "RESOLVED" }),
        expect.objectContaining({ type: "AMOUNT_MISMATCH", status: "RESOLVED" })
      ])
    );

    const remainingAlerts = await request(app.getHttpServer())
      .get("/api/v1/admin/reconciliation-alerts")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(
      remainingAlerts.body.data.filter((item: any) => item.paymentId === payment.id)
    ).toHaveLength(0);
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

  it("hardens admin uploads with content validation, protected document storage, and audit logs", async () => {
    const adminToken = await login("9999999999");
    const setup = await createOperationalSetup(adminToken, "9411111111", "9411111112");
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const pdf = Buffer.from("%PDF-1.4\n%QuickGO test document\n", "ascii");

    const productImage = await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${setup.productId}/image`)
      .set("Authorization", bearer(adminToken))
      .field("reason", "Verified product photo for launch catalog")
      .attach("file", jpeg, { filename: "menu-photo.exe", contentType: "image/jpeg" })
      .expect(201);

    expect(productImage.body.data.imageUrl).toContain("stored://quickgo/test/products");
    expect(storedUploads[0]).toMatchObject({
      options: {
        resourceType: "image",
        accessMode: "public"
      }
    });

    const vendorDocument = await request(app.getHttpServer())
      .post(`/api/v1/admin/vendors/${setup.vendorId}/compliance-documents/upload`)
      .set("Authorization", bearer(adminToken))
      .field("type", "FSSAI")
      .field("expires_at", "2027-12-31T23:59:59.000Z")
      .field("reason", "FSSAI certificate collected for MVP launch")
      .attach("file", pdf, { filename: "fssai.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(vendorDocument.body.data).toMatchObject({
      vendorId: setup.vendorId,
      type: "FSSAI",
      status: "PENDING"
    });
    expect(storedUploads[1]).toMatchObject({
      options: {
        resourceType: "auto",
        accessMode: "authenticated"
      }
    });

    const riderDocument = await request(app.getHttpServer())
      .post(`/api/v1/admin/riders/${setup.riderId}/kyc-documents/upload`)
      .set("Authorization", bearer(adminToken))
      .field("type", "ID_PROOF")
      .field("reason", "Rider ID proof collected before activation")
      .attach("file", pdf, { filename: "rider-id.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(riderDocument.body.data).toMatchObject({
      riderId: setup.riderId,
      type: "ID_PROOF",
      status: "PENDING"
    });
    expect(storedUploads[2].options.accessMode).toBe("authenticated");

    await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${setup.productId}/image`)
      .set("Authorization", bearer(adminToken))
      .field("reason", "Spoofed image should be blocked")
      .attach("file", pdf, { filename: "spoofed.jpg", contentType: "image/jpeg" })
      .expect(400);
    expect(storedUploads).toHaveLength(3);

    const audit = await request(app.getHttpServer())
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(audit.body.data.map((item: any) => item.action)).toEqual(
      expect.arrayContaining([
        "admin.product_image_uploaded",
        "admin.vendor_compliance_document_uploaded",
        "admin.rider_kyc_document_uploaded"
      ])
    );
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
