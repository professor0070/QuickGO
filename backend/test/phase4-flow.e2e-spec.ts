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

describe("QuickGO Phase 4 Vendor/Product/Category Flow (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: InMemoryPrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(phone: string) {
    const normalized = normalizeIndianPhone(phone);
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/verify-otp")
      .send({ phone: normalized, otp: "123456" })
      .expect(201);
    return response.body.data.access_token as string;
  }

  function bearer(token: string) {
    return `Bearer ${token}`;
  }

  it("handles category administration successfully", async () => {
    const adminToken = await login("9999999999");

    // 1. Block categories outside the locked MVP food scope.
    await request(app.getHttpServer())
      .post("/api/v1/admin/categories")
      .set("Authorization", bearer(adminToken))
      .send({
        code: "MEAT",
        name: "Fresh Meat",
        sort_order: 5,
        is_fresh: true
      })
      .expect(400);

    // 2. Reject duplicate seeded categories.
    await request(app.getHttpServer())
      .post("/api/v1/admin/categories")
      .set("Authorization", bearer(adminToken))
      .send({
        code: "DAIRY",
        name: "Fresh Dairy",
        sort_order: 5,
        is_fresh: true
      })
      .expect(400);

    const listBeforeUpdate = await request(app.getHttpServer())
      .get("/api/v1/admin/categories")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    const dairyCategory = listBeforeUpdate.body.data.find((c: any) => c.code === "DAIRY");
    expect(dairyCategory).toBeTruthy();

    // 3. Update a seeded allowed category
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/categories/${dairyCategory.id}`)
      .set("Authorization", bearer(adminToken))
      .send({
        name: "Organic Dairy",
        sort_order: 6
      })
      .expect(200);

    expect(updateRes.body.data.name).toBe("Organic Dairy");
    expect(updateRes.body.data.sortOrder).toBe(6);

    // 4. List all categories
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/admin/categories")
      .set("Authorization", bearer(adminToken))
      .expect(200);

    expect(listRes.body.data.some((c: any) => c.code === "DAIRY")).toBe(true);
    expect(listRes.body.data.some((c: any) => c.code === "MEAT")).toBe(false);
  });

  it("handles vendor profile management, document uploads, and product validations", async () => {
    const adminToken = await login("9999999999");

    // 1. Onboard a vendor
    const vendorRes = await request(app.getHttpServer())
      .post("/api/v1/admin/vendors")
      .set("Authorization", bearer(adminToken))
      .send({
        shop_name: "Fresh Mart",
        owner_name: "John Doe",
        owner_phone: "9876543210",
        category_code: "VEGETABLES",
        service_zone_id: serviceZoneId,
        address_line: "Main Bazaar",
        city: "Jhajha",
        state: "Bihar",
        commission_rate: 8
      })
      .expect(201);

    const vendorToken = await login("9876543210");

    // 2. Retrieve vendor profile
    const profileRes = await request(app.getHttpServer())
      .get("/api/v1/vendor/profile")
      .set("Authorization", bearer(vendorToken))
      .expect(200);

    expect(profileRes.body.data.shopName).toBe("Fresh Mart");

    // 3. Update vendor profile
    const updateProfileRes = await request(app.getHttpServer())
      .patch("/api/v1/vendor/profile")
      .set("Authorization", bearer(vendorToken))
      .send({
        shop_name: "Super Fresh Mart",
        owner_name: "John Doe",
        address_line: "Sub Bazaar",
        city: "Jhajha",
        state: "Bihar"
      })
      .expect(200);

    expect(updateProfileRes.body.data.shopName).toBe("Super Fresh Mart");

    // 4. Upload compliance document
    const docRes = await request(app.getHttpServer())
      .post("/api/v1/vendor/compliance-documents")
      .set("Authorization", bearer(vendorToken))
      .send({
        type: "FSSAI",
        document_url: "https://example.com/fssai.pdf",
        expires_at: "2027-12-31T23:59:59.000Z"
      })
      .expect(201);

    expect(docRes.body.data.type).toBe("FSSAI");
    expect(docRes.body.data.status).toBe("PENDING");

    // 5. List compliance documents
    const docList = await request(app.getHttpServer())
      .get("/api/v1/vendor/compliance-documents")
      .set("Authorization", bearer(vendorToken))
      .expect(200);

    expect(docList.body.data.length).toBeGreaterThan(0);

    // 6. Create product (success)
    const prodRes = await request(app.getHttpServer())
      .post("/api/v1/vendor/products")
      .set("Authorization", bearer(vendorToken))
      .send({
        category_id: prisma.categoryId("VEGETABLES"),
        name: "Fresh Tomato",
        unit: "kg",
        price: 40,
        mrp: 50,
        shelf_life_days: 3,
        freshness_status: "FRESH"
      })
      .expect(201);

    expect(prodRes.body.data.name).toBe("Fresh Tomato");
    expect(prodRes.body.data.mrp).toBe(50);

    // 7. Create product (fail: sellingPrice > MRP)
    await request(app.getHttpServer())
      .post("/api/v1/vendor/products")
      .set("Authorization", bearer(vendorToken))
      .send({
        category_id: prisma.categoryId("VEGETABLES"),
        name: "Fresh Tomato Stale",
        unit: "kg",
        price: 60,
        mrp: 50
      })
      .expect(400);

    // 8. Create product (fail: invalid unit for fresh category)
    await request(app.getHttpServer())
      .post("/api/v1/vendor/products")
      .set("Authorization", bearer(vendorToken))
      .send({
        category_id: prisma.categoryId("VEGETABLES"),
        name: "Tomato Packet",
        unit: "box",
        price: 40,
        mrp: 50
      })
      .expect(400);

    // 9. Update product (success)
    const updateProd = await request(app.getHttpServer())
      .patch(`/api/v1/vendor/products/${prodRes.body.data.id}`)
      .set("Authorization", bearer(vendorToken))
      .send({
        price: 45,
        mrp: 50
      })
      .expect(200);

    expect(updateProd.body.data.mrp).toBe(50);

    // 10. Delete product (success)
    await request(app.getHttpServer())
      .delete(`/api/v1/vendor/products/${prodRes.body.data.id}`)
      .set("Authorization", bearer(vendorToken))
      .expect(200);
  });
});
