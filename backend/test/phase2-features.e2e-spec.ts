import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";
import { PrismaService } from "../src/modules/common/prisma.service";
import { InMemoryPrismaService } from "./support/in-memory-prisma";
import { normalizeIndianPhone } from "../src/common/phone.util";

const request = require("supertest") as any;
const serviceZoneId = "00000000-0000-4000-8000-000000000001";
const validHexKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("QuickGO Phase 2 Backend Features (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: InMemoryPrismaService;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
    process.env.MOCK_OTP_CODE = "123456";
    process.env.BANK_DETAILS_ENCRYPTION_KEY = validHexKey;
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    prisma.reset();
    prisma.seedUserWithRoles(normalizeIndianPhone("9999999999"), ["SUPER_ADMIN"]);
    prisma.seedUserWithRoles(normalizeIndianPhone("8888888888"), ["ZONE_ADMIN"]);
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(phone: string, appContext?: string) {
    const normalized = normalizeIndianPhone(phone);
    let ctx = appContext;
    if (!ctx) {
      const user = (prisma as any).store.users.find((u: any) => normalizeIndianPhone(u.phone) === normalized);
      if (user) {
        const userRoles = (prisma as any).store.userRoles
          .filter((ur: any) => ur.userId === user.id)
          .map((ur: any) => (prisma as any).store.roles.find((r: any) => r.id === ur.roleId)?.code);
        if (userRoles.includes("SUPER_ADMIN") || userRoles.includes("ADMIN") || userRoles.includes("ZONE_ADMIN")) {
          ctx = "ADMIN";
        } else if (userRoles.includes("RIDER") || userRoles.includes("VENDOR_OWNER") || userRoles.includes("VENDOR_STAFF")) {
          ctx = "PARTNER";
        } else {
          ctx = "CUSTOMER";
        }
      } else {
        ctx = "CUSTOMER";
      }
    }
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/verify-otp")
      .send({ phone: normalized, otp: "123456", appContext: ctx })
      .expect(201);
    return response.body.data.access_token as string;
  }

  function bearer(token: string) {
    return `Bearer ${token}`;
  }

  describe("Bank Details Maker-Checker & History Workflow", () => {
    it("should process bank details submission, review approval, masking, and history", async () => {
      const adminToken = await login("9999999999");

      // 1. Onboard vendor first
      await request(app.getHttpServer())
        .post("/api/v1/admin/vendors")
        .set("Authorization", bearer(adminToken))
        .send({
          shop_name: "Fresh Mart",
          owner_name: "John Doe",
          owner_phone: "7777777777",
          category_code: "VEGETABLES",
          service_zone_id: serviceZoneId,
          address_line: "Main Bazaar",
          city: "Mumbai",
          state: "MH",
          commission_rate: 8
        })
        .expect(201);

      const vendorToken = await login("7777777777");

      // 2. Submit bank details from vendor owner (enters PENDING_REVIEW in history)
      await request(app.getHttpServer())
        .post("/api/v1/vendor/bank-details")
        .set("Authorization", bearer(vendorToken))
        .send({
          account_holder: "Vendor Owner Name",
          account_number: "123456789012",
          bank_name: "State Bank of India",
          ifsc_code: "SBIN0001234",
          branch_name: "Mumbai Main",
          upi_id: "vendor@upi",
          document_url: "http://storage.local/proof.jpg"
        })
        .expect(201);

      // Verify vendor has no active approved bank details yet
      const vendors = await prisma.vendor.findMany({
        where: { shopName: "Fresh Mart" }
      });
      const vendor = vendors[0];
      expect(vendor).toBeTruthy();

      await request(app.getHttpServer())
        .get(`/api/v1/admin/vendors/${vendor.id}/bank-details`)
        .set("Authorization", bearer(adminToken))
        .expect(404);

      // 3. Admin queries history and fetches the pending version
      const historyRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/vendors/${vendor.id}/bank-detail-history`)
        .set("Authorization", bearer(adminToken))
        .expect(200);

      expect(historyRes.body.data.length).toBe(1);
      const pendingVersion = historyRes.body.data[0];
      expect(pendingVersion.status).toBe("PENDING_REVIEW");
      expect(pendingVersion.accountNumber).toBe("********9012"); // Masked!

      // 4. Admin approves the bank details version
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bank-detail-versions/${pendingVersion.id}/review`)
        .set("Authorization", bearer(adminToken))
        .send({
          status: "APPROVED"
        })
        .expect(200);

      // 5. Query active bank details (should now succeed and return masked accountNumber)
      const activeRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/vendors/${vendor.id}/bank-details`)
        .set("Authorization", bearer(adminToken))
        .expect(200);

      expect(activeRes.body.data.accountNumber).toBe("********9012");
    });
  });

  describe("Suspension & Termination Lifecycle Blocks", () => {
    it("should restrict operations on suspended or terminated vendors", async () => {
      const adminToken = await login("9999999999");

      // Onboard vendor
      await request(app.getHttpServer())
        .post("/api/v1/admin/vendors")
        .set("Authorization", bearer(adminToken))
        .send({
          shop_name: "Lifecycle Shop",
          owner_name: "John Doe",
          owner_phone: "7777777778",
          category_code: "VEGETABLES",
          service_zone_id: serviceZoneId,
          address_line: "Main Bazaar",
          city: "Mumbai",
          state: "MH",
          commission_rate: 8
        })
        .expect(201);

      const vendorToken = await login("7777777778");
      const vendors = await prisma.vendor.findMany({
        where: { shopName: "Lifecycle Shop" }
      });
      const vendor = vendors[0];

      // 1. Suspend the partner
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/partners/${vendor.id}/suspend`)
        .set("Authorization", bearer(adminToken))
        .send({
          status: true,
          reason: "Policy audit pending"
        })
        .expect(200);

      // Try calling write operations (must fail with 403 Forbidden)
      await request(app.getHttpServer())
        .post("/api/v1/vendor/bank-details")
        .set("Authorization", bearer(vendorToken))
        .send({
          account_holder: "Vendor",
          account_number: "123456789",
          bank_name: "Bank",
          ifsc_code: "IFSC001"
        })
        .expect(403);

      // 2. Reinstate the partner
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/partners/${vendor.id}/reinstate`)
        .set("Authorization", bearer(adminToken))
        .send({
          status: false,
          reason: "Audit cleared"
        })
        .expect(200);

      // Now write operation succeeds
      await request(app.getHttpServer())
        .post("/api/v1/vendor/bank-details")
        .set("Authorization", bearer(vendorToken))
        .send({
          account_holder: "Vendor",
          account_number: "123456789",
          bank_name: "Bank",
          ifsc_code: "IFSC001"
        })
        .expect(201);

      // 3. Terminate agreement
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/partners/${vendor.id}/terminate`)
        .set("Authorization", bearer(adminToken))
        .send({
          status: true,
          reason: "Agreement ended"
        })
        .expect(200);

      // Write operation is blocked again
      await request(app.getHttpServer())
        .post("/api/v1/vendor/bank-details")
        .set("Authorization", bearer(vendorToken))
        .send({
          account_holder: "Vendor",
          account_number: "123456789",
          bank_name: "Bank",
          ifsc_code: "IFSC001"
        })
        .expect(403);

      // Try reinstating terminated vendor (must fail with 400 Bad Request)
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/partners/${vendor.id}/reinstate`)
        .set("Authorization", bearer(adminToken))
        .send({
          status: false,
          reason: "Try to reinstate"
        })
        .expect(400);
    });
  });

  describe("Role Boundaries (Offboarding Restriction)", () => {
    it("should reject Zone Admin offboarding a vendor and allow Super Admin", async () => {
      const superAdminToken = await login("9999999999");
      const zoneAdminToken = await login("8888888888");

      const vendor = await prisma.vendor.create({
        data: {
          shopName: "Test Shop",
          ownerName: "Owner Name",
          ownerPhone: "+917777777799",
          categoryCode: "GROCERY",
          serviceZoneId,
          addressLine: "Line 1",
          city: "Mumbai",
          state: "MH"
        }
      });

      // 1. Zone Admin tries to offboard (must fail with 403 Forbidden)
      await request(app.getHttpServer())
        .post(`/api/v1/admin/vendors/${vendor.id}/offboard`)
        .set("Authorization", bearer(zoneAdminToken))
        .expect(403);

      // 2. Super Admin tries to offboard (must succeed with 201)
      await request(app.getHttpServer())
        .post(`/api/v1/admin/vendors/${vendor.id}/offboard`)
        .set("Authorization", bearer(superAdminToken))
        .expect(201);
    });
  });
});
