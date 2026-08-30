import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/modules/common/prisma.service";
import { InMemoryPrismaService } from "./support/in-memory-prisma";
import { AuthService } from "../src/modules/auth/auth.service";
import { AdminService } from "../src/modules/admin/admin.service";
import { ServiceZonesService } from "../src/modules/service-zones/service-zones.service";
import { ZoneScopeGuard } from "../src/common/auth/zone-scope.guard";
import { ForbiddenException, UnauthorizedException, BadRequestException } from "@nestjs/common";

import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";

describe("Super Admin / Zone Admin Architecture E2E Tests (18 Scenarios)", () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let authService: AuthService;
  let adminService: AdminService;
  let zonesService: ServiceZonesService;
  let zoneScopeGuard: ZoneScopeGuard;

  let superAdminUser: any;
  let zoneAdminUser: any;
  let unapprovedZoneAdminUser: any;
  let testZone1: any;
  let testZone2: any;
  let testAssignment: any;

  beforeAll(async () => {
    prisma = new InMemoryPrismaService();
    zoneScopeGuard = new ZoneScopeGuard(prisma as any);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    adminService = moduleFixture.get<AdminService>(AdminService);
    zonesService = moduleFixture.get<ServiceZonesService>(ServiceZonesService);

    // Setup Super Admin user
    superAdminUser = await prisma.seedUserWithRoles("9800000001", ["SUPER_ADMIN"]);
    zoneAdminUser = await prisma.seedUserWithRoles("9800000002", ["ZONE_ADMIN"]);
    unapprovedZoneAdminUser = await prisma.seedUserWithRoles("9800000003", ["ZONE_ADMIN"]);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  test("TEST 1: SUPER_ADMIN can create Zone ID", async () => {
    testZone1 = await zonesService.create(
      {
        name: "Patna Central",
        city: "Patna",
        state: "Bihar",
        center_latitude: 25.5941,
        center_longitude: 85.1376,
        radius_km: 5.0,
        reason: "Initial Zone Creation Patna"
      },
      superAdminUser.id
    );

    expect(testZone1).toBeDefined();
    expect(testZone1.id).toBeDefined();
    expect(testZone1.isActive).toBe(true);
    expect(testZone1.status).toBe("ACTIVE");
  });

  test("TEST 2 & 3: SUPER_ADMIN can assign Zone Admin and new assignment starts PENDING", async () => {
    testZone2 = await zonesService.create(
      {
        name: "Jhajha Central",
        city: "Jhajha",
        state: "Bihar",
        center_latitude: 24.7725,
        center_longitude: 86.3816,
        radius_km: 4.0,
        reason: "Initial Zone Creation Jhajha"
      },
      superAdminUser.id
    );

    testAssignment = await adminService.assignZoneAdmin(
      {
        admin_user_id: unapprovedZoneAdminUser.id,
        service_zone_id: testZone2.id
      },
      superAdminUser.id
    );

    expect(testAssignment).toBeDefined();
    expect(testAssignment.status).toBe("PENDING");
  });

  test("TEST 4: Pending Zone Admin cannot access Zone Admin Panel", async () => {
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: unapprovedZoneAdminUser.id, roles: ["ZONE_ADMIN"], appContext: "ADMIN" },
          params: { zoneId: testZone2.id }
        })
      })
    };

    await expect(zoneScopeGuard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  test("TEST 5: SUPER_ADMIN approves Zone Admin", async () => {
    const approvedAssignment = await adminService.approveZoneAssignment(
      testAssignment.id,
      superAdminUser.id
    );

    expect(approvedAssignment.status).toBe("APPROVED");
  });

  test("TEST 6: Approved Zone Admin can access ONLY assigned zone", async () => {
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: unapprovedZoneAdminUser.id, roles: ["ZONE_ADMIN"], appContext: "ADMIN" },
          params: { zoneId: testZone2.id }
        })
      })
    };

    const allowed = await zoneScopeGuard.canActivate(mockContext);
    expect(allowed).toBe(true);
  });

  test("TEST 7: Zone Admin cannot access another zone by manipulating API parameters", async () => {
    const mockContextAnotherZone: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: unapprovedZoneAdminUser.id, roles: ["ZONE_ADMIN"], appContext: "ADMIN" },
          params: { zoneId: testZone1.id }
        })
      })
    };

    await expect(zoneScopeGuard.canActivate(mockContextAnotherZone)).rejects.toThrow(ForbiddenException);
  });

  test("TEST 8: Zone Admin cannot assign or modify role permissions", async () => {
    await expect(
      adminService.assignRole(unapprovedZoneAdminUser.id, "SUPER_ADMIN", unapprovedZoneAdminUser.id)
    ).rejects.toThrow(BadRequestException);
  });

  test("TEST 9: SUPER_ADMIN can deactivate a Zone", async () => {
    const deactivatedZone = await adminService.deactivateServiceZone(testZone2.id, superAdminUser.id);
    expect(deactivatedZone.isActive).toBe(false);
    expect(deactivatedZone.status).toBe("DEACTIVATED");
  });

  test("TEST 10: Deactivated Zone Admin loses access", async () => {
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: unapprovedZoneAdminUser.id, roles: ["ZONE_ADMIN"], appContext: "ADMIN" },
          params: { zoneId: testZone2.id }
        })
      })
    };

    await expect(zoneScopeGuard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  test("TEST 11: Operational activity against inactive zone is rejected in guard", async () => {
    const mockContextOrder: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: unapprovedZoneAdminUser.id, roles: ["ZONE_ADMIN"], appContext: "ADMIN" },
          params: { serviceZoneId: testZone2.id }
        })
      })
    };

    await expect(zoneScopeGuard.canActivate(mockContextOrder)).rejects.toThrow(ForbiddenException);
  });

  test("TEST 12: SUPER_ADMIN can reactivate a valid Zone and operational status becomes active", async () => {
    const reactivatedZone = await adminService.reactivateServiceZone(testZone2.id, superAdminUser.id);
    expect(reactivatedZone.isActive).toBe(true);
    expect(reactivatedZone.status).toBe("ACTIVE");

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: unapprovedZoneAdminUser.id, roles: ["ZONE_ADMIN"], appContext: "ADMIN" },
          params: { zoneId: testZone2.id }
        })
      })
    };

    const allowed = await zoneScopeGuard.canActivate(mockContext);
    expect(allowed).toBe(true);
  });

  test("TEST 13: Deprecated ADMIN role cannot be assigned", async () => {
    await expect(
      adminService.assignRole(unapprovedZoneAdminUser.id, "ADMIN", superAdminUser.id)
    ).rejects.toThrow(BadRequestException);
  });

  test("TEST 14: Admin login mode validation rejects mismatch", async () => {
    const dto: any = {
      phone: unapprovedZoneAdminUser.phone,
      otp: "123456",
      appContext: "ADMIN",
      adminMode: "SUPER_ADMIN"
    };

    // Attempt login as SUPER_ADMIN with only ZONE_ADMIN role
    await expect(authService.verifyOtp(dto)).rejects.toThrow(UnauthorizedException);
  });

  test("TEST 15: SUPER_ADMIN is not restricted by zone boundaries", async () => {
    const mockContextSuper: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: superAdminUser.id, roles: ["SUPER_ADMIN"], appContext: "ADMIN" },
          params: { zoneId: testZone1.id }
        })
      })
    };

    const allowed = await zoneScopeGuard.canActivate(mockContextSuper);
    expect(allowed).toBe(true);
  });

  test("TEST 16: ZONE_ADMIN cannot receive SUPER_ADMIN privileges through parameter manipulation", async () => {
    await expect(
      adminService.assignRole(zoneAdminUser.id, "SUPER_ADMIN", zoneAdminUser.id)
    ).rejects.toThrow(BadRequestException);
  });

  test("TEST 17: Historical zone data remains preserved after zone deactivation", async () => {
    // Create mock order in zone 1
    const mockOrder = await prisma.order.create({
      data: {
        id: "ord-test-hist-001",
        serviceZoneId: testZone1.id,
        customerId: "cust-01",
        vendorId: "vend-01",
        orderNumber: "QG-HIST-001",
        totalAmount: 250,
        payableAmount: 250
      }
    });

    // Deactivate Zone 1
    await adminService.deactivateServiceZone(testZone1.id, superAdminUser.id);

    // Verify order record still exists in DB
    const fetchedOrder = await prisma.order.findUnique({ where: { id: "ord-test-hist-001" } });
    expect(fetchedOrder).toBeDefined();
    expect(fetchedOrder.totalAmount).toBe(250);

    // Reactivate Zone 1 for cleanliness
    await adminService.reactivateServiceZone(testZone1.id, superAdminUser.id);
  });

  test("TEST 18: Audit logs are created for sensitive zone & admin operations", async () => {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["admin.zone_deactivated", "admin.zone_reactivated", "admin.zone_admin_approved"] }
      }
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(3);
  });
});
