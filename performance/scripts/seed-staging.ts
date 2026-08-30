import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function getEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.resolve(__dirname, "../../backend/.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && match[1] === key) {
          let val = match[2] ? match[2].trim() : "";
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          return val;
        }
      }
    }
  } catch (e) {
    // Ignore error
  }
  return undefined;
}

function enforceSafety() {
  const loadTestEnv = getEnv("LOAD_TEST_ENV");
  const allowLoadTest = getEnv("ALLOW_LOAD_TEST");
  const otpProvider = getEnv("OTP_PROVIDER");
  const dbUrl = getEnv("DATABASE_URL") || "";
  const runId = getEnv("LOADTEST_RUN_ID");

  console.log(`[SAFETY CHECK] LOAD_TEST_ENV = ${loadTestEnv ? "Redacted(Set)" : "undefined"}`);
  console.log(`[SAFETY CHECK] ALLOW_LOAD_TEST = ${allowLoadTest ? "Redacted(Set)" : "undefined"}`);
  console.log(`[SAFETY CHECK] OTP_PROVIDER = ${otpProvider ? "Redacted(Set)" : "undefined"}`);
  console.log(`[SAFETY CHECK] LOADTEST_RUN_ID = ${runId ? "Redacted(Set)" : "undefined"}`);

  if (loadTestEnv !== "staging") {
    console.error("CRITICAL ERROR: LOAD_TEST_ENV must be set to 'staging'.");
    process.exit(1);
  }

  if (allowLoadTest !== "true") {
    console.error("CRITICAL ERROR: ALLOW_LOAD_TEST must be set to 'true'.");
    process.exit(1);
  }

  if (otpProvider !== "mock") {
    console.error("CRITICAL ERROR: OTP_PROVIDER must be set to 'mock'.");
    process.exit(1);
  }

  if (!runId) {
    console.error("CRITICAL ERROR: LOADTEST_RUN_ID is missing.");
    process.exit(1);
  }

  // Parse Database host
  let dbHost = "";
  try {
    const match = dbUrl.match(/@([\w.-]+):/);
    dbHost = match ? match[1] : "";
  } catch (e) {
    console.error("CRITICAL ERROR: Failed to parse Database host URL.");
    process.exit(1);
  }

  // Strict local/staging database host allowlist
  const allowedDbHosts = ["localhost", "127.0.0.1", "database", "172.17.0.1", "172.18.0.1"];
  if (!allowedDbHosts.includes(dbHost.toLowerCase()) && dbHost !== "") {
    console.error(`CRITICAL ERROR: DB Host "${dbHost}" is not in staging allowlist: ${JSON.stringify(allowedDbHosts)}`);
    process.exit(1);
  }

  // Anti-production keyword checks
  const lowerDbUrl = dbUrl.toLowerCase();
  const prodSignatures = ["prod", "production", "live", "db-prod", "amazonaws.com", "supabase.co", "elephantsql.com"];
  for (const sig of prodSignatures) {
    if (lowerDbUrl.includes(sig) && !lowerDbUrl.includes("staging") && !lowerDbUrl.includes("quickgo_production")) {
      console.error(`CRITICAL ERROR: Production DB signature detected: '${sig}'. Aborting.`);
      process.exit(1);
    }
  }

  console.log("[SAFETY CHECK] Staging environment identity successfully verified.");
}

async function getStats(runId: string) {
  // Query counts of records matching the current run identifier
  const userCount = await prisma.user.count({ where: { email: { contains: `_${runId}` } } });
  const customerCount = await prisma.customer.count({ where: { name: { contains: `_${runId}` } } });
  
  // Find customer IDs matching this run to query orders
  const testCustomers = await prisma.customer.findMany({
    where: { name: { contains: `_${runId}` } },
    select: { id: true }
  });
  const testCustomerIds = testCustomers.map((c) => c.id);

  const riderCount = await prisma.rider.count({ where: { name: { contains: `_${runId}` } } });
  const vendorCount = await prisma.vendor.count({ where: { shopName: { contains: `_${runId}` } } });
  const productCount = await prisma.product.count({ where: { name: { contains: `_${runId}` } } });
  const orderCount = await prisma.order.count({
    where: {
      OR: [
        { customerId: { in: testCustomerIds } },
        { orderNumber: { startsWith: `QG-LT-${runId}` } }
      ]
    }
  });
  const notificationCount = await prisma.notification.count({ where: { title: { contains: `_${runId}` } } });

  return {
    users: userCount,
    customers: customerCount,
    riders: riderCount,
    vendors: vendorCount,
    products: productCount,
    orders: orderCount,
    notifications: notificationCount
  };
}

async function seed(runId: string, isDryRun: boolean) {
  if (isDryRun) {
    console.log(`[DRY RUN] Simulating seed of staging load-test dataset for run: ${runId}`);
    console.log("- Will seed: 5 Service Zones");
    console.log("- Will seed: 20 Vendors");
    console.log("- Will seed: 20 Riders");
    console.log("- Will seed: 500 Customers");
    console.log("- Will seed: 5,000 Products (250 per Vendor)");
    console.log("- Will seed: 2,000 Historical Orders");
    console.log("- Will seed: 1,000 Notifications");
    console.log("[DRY RUN] Seed simulation completed successfully.");
    return;
  }

  console.log(`Seeding staging database for run: ${runId}...`);

  // Verify launch zone exists
  const existingZone = await prisma.serviceZone.findFirst({ where: { city: "Jhajha" } });
  if (!existingZone) {
    throw new Error("Baseline service zone (Jhajha) must exist. Run prisma:seed first.");
  }
  const zoneId = existingZone.id;

  const customerRole = await prisma.role.findUniqueOrThrow({ where: { code: "CUSTOMER" } });
  const riderRole = await prisma.role.findUniqueOrThrow({ where: { code: "RIDER" } });
  const vendorOwnerRole = await prisma.role.findUniqueOrThrow({ where: { code: "VENDOR_OWNER" } });
  const category = await prisma.category.findUniqueOrThrow({ where: { code: "RESTAURANT_FOOD" } });

  // Use transactional seeding to ensure all-or-nothing rollback
  await prisma.$transaction(async (tx) => {
    // 1. Seed 5 Service Zones (Offset index to avoid collisions)
    console.log("Seeding 5 Service Zones...");
    for (let i = 1; i <= 5; i++) {
      const szId = `00000000-0000-4000-8000-00000000100${i}`;
      await tx.serviceZone.upsert({
        where: { id: szId },
        update: {},
        create: {
          id: szId,
          name: `LOADTEST_Zone_${runId}_${i}`,
          city: `Jhajha_${i}`,
          state: "Bihar",
          centerLatitude: 24.775 + (i * 0.01),
          centerLongitude: 86.38 + (i * 0.01),
          radiusKm: 3.0,
          isActive: true
        }
      });
    }

    // 2. Seed 20 Vendors (Offset index to avoid collisions)
    console.log("Seeding 20 Vendors...");
    const vendorIds: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const phoneNum = `+919200000${String(i).padStart(3, "0")}`;
      const ownerName = `LOADTEST_VendorOwner_${runId}_${i}`;
      const shopName = `LOADTEST_Shop_${runId}_${i}`;
      const email = `LOADTEST_vendor_${runId}_${i}@example.com`;
      const vId = `00000000-0000-4000-9000-000000001${String(i).padStart(3, "0")}`;
      vendorIds.push(vId);

      const user = await tx.user.create({
        data: {
          phone: phoneNum,
          name: ownerName,
          email,
          status: "ACTIVE",
          roles: { create: { roleId: vendorOwnerRole.id } }
        }
      });

      await tx.vendor.create({
        data: {
          id: vId,
          shopName,
          ownerName,
          ownerPhone: phoneNum,
          categoryCode: "RESTAURANT_FOOD",
          serviceZoneId: zoneId,
          addressLine: "Jhajha Main Road",
          city: "Jhajha",
          state: "Bihar",
          isOpen: true,
          status: "APPROVED",
          onboardingStatus: "APPROVED",
          staff: {
            create: {
              userId: user.id,
              role: "OWNER",
              status: "ACTIVE"
            }
          }
        }
      });
    }

    // 3. Seed 20 Riders
    console.log("Seeding 20 Riders...");
    for (let i = 1; i <= 20; i++) {
      const phoneNum = `+919100000${String(i).padStart(3, "0")}`;
      const name = `LOADTEST_Rider_${runId}_${i}`;
      const email = `LOADTEST_rider_${runId}_${i}@example.com`;

      const user = await tx.user.create({
        data: {
          phone: phoneNum,
          name,
          email,
          status: "ACTIVE",
          roles: { create: { roleId: riderRole.id } }
        }
      });

      await tx.rider.create({
        data: {
          userId: user.id,
          name,
          phone: phoneNum,
          vehicleType: "Two Wheeler",
          vehicleNumber: `LOADTEST_JH-15-${runId}-${i}`,
          serviceZoneId: zoneId,
          isOnline: true,
          status: "APPROVED",
          onboardingStatus: "APPROVED"
        }
      });
    }

    // 4. Seed 500 Customers
    console.log("Seeding 500 Customers...");
    const customerIds: string[] = [];
    for (let i = 1; i <= 500; i++) {
      const phoneNum = `+919000000${String(i).padStart(3, "0")}`;
      const name = `LOADTEST_Customer_${runId}_${i}`;
      const email = `LOADTEST_customer_${runId}_${i}@example.com`;

      const user = await tx.user.create({
        data: {
          phone: phoneNum,
          name,
          email,
          status: "ACTIVE",
          roles: { create: { roleId: customerRole.id } }
        }
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          name,
          status: "ACTIVE"
        }
      });
      customerIds.push(customer.id);

      await tx.address.create({
        data: {
          customerId: customer.id,
          receiverName: name,
          receiverPhone: phoneNum,
          line1: "LOADTEST Street Address",
          city: "Jhajha",
          state: "Bihar",
          isDefault: true
        }
      });
    }

    // 5. Seed 5,000 Products (250 per vendor)
    console.log("Seeding 5,000 Products...");
    for (const vId of vendorIds) {
      const productData = [];
      for (let p = 1; p <= 250; p++) {
        productData.push({
          vendorId: vId,
          categoryId: category.id,
          name: `LOADTEST_Product_${runId}_${vId.substring(vId.length - 3)}_${p}`,
          unit: "unit",
          isApproved: true,
          isAvailable: true,
          approvalStatus: "APPROVED" as any
        });
      }
      await tx.product.createMany({ data: productData });

      // Fetch created product IDs to seed prices
      const products = await tx.product.findMany({
        where: { vendorId: vId, name: { contains: `_${runId}_` } },
        select: { id: true }
      });

      const priceData = products.map((prod) => ({
        productId: prod.id,
        price: 100.00,
        mrp: 120.00,
        isActive: true
      }));
      await tx.productPrice.createMany({ data: priceData });
    }

    // 6. Seed 2,000 Historical Orders (4 per customer)
    console.log("Seeding 2,000 Historical Orders...");
    const orderData = [];
    for (let i = 0; i < 2000; i++) {
      const cId = customerIds[i % customerIds.length];
      const vId = vendorIds[i % vendorIds.length];
      orderData.push({
        orderNumber: `QG-LT-${runId}-${i}`,
        customerId: cId,
        vendorId: vId,
        serviceZoneId: zoneId,
        status: "COMPLETED" as any,
        paymentMethod: "COD" as any,
        paymentStatus: "COLLECTED" as any,
        itemTotal: 100.00,
        deliveryFee: 20.00,
        platformFee: 2.00,
        totalAmount: 122.00,
        customerSnapshot: {},
        vendorSnapshot: {},
        deliveryAddressSnapshot: {}
      });
    }
    await tx.order.createMany({ data: orderData });

    // 7. Seed 1,000 Notifications
    console.log("Seeding 1,000 Notifications...");
    const notifData = [];
    const users = await tx.user.findMany({
      where: { email: { contains: `_${runId}` } },
      select: { id: true },
      take: 1000
    });
    for (let i = 0; i < 1000; i++) {
      const u = users[i % users.length];
      notifData.push({
        userId: u.id,
        title: `LOADTEST_Notification_${runId}`,
        body: `Testing push notifications for run ${runId}`,
        deliveryStatus: "SENT"
      });
    }
    await tx.notification.createMany({ data: notifData });
  });

  console.log("Seeding completed successfully.");
}

async function cleanup(runId: string, isDryRun: boolean) {
  const stats = await getStats(runId);

  if (isDryRun) {
    console.log(`[DRY RUN] Simulating cleanup for LOADTEST_RUN_ID: ${runId}`);
    console.log(`- Will delete: ${stats.orders} synthetic orders`);
    console.log(`- Will delete: ${stats.products} synthetic products`);
    console.log(`- Will delete: ${stats.vendors} synthetic vendors`);
    console.log(`- Will delete: ${stats.riders} synthetic riders`);
    console.log(`- Will delete: ${stats.customers} synthetic customers`);
    console.log(`- Will delete: ${stats.users} synthetic users`);
    console.log(`- Will delete: ${stats.notifications} synthetic notifications`);
    console.log("[DRY RUN] Cleanup simulation completed successfully.");
    return;
  }

  console.log(`Cleaning up database records matching LOADTEST_RUN_ID: ${runId}...`);

  await prisma.$transaction(async (tx) => {
    // 1. Fetch exact IDs of entities containing the run identifier
    const testUsers = await tx.user.findMany({ where: { email: { contains: `_${runId}` } }, select: { id: true } });
    const testUserIds = testUsers.map((u) => u.id);

    const testCustomers = await tx.customer.findMany({ where: { name: { contains: `_${runId}` } }, select: { id: true, userId: true } });
    const testCustomerIds = testCustomers.map((c) => c.id);

    const testVendors = await tx.vendor.findMany({ where: { shopName: { contains: `_${runId}` } }, select: { id: true } });
    const testVendorIds = testVendors.map((v) => v.id);

    const testRiders = await tx.rider.findMany({ where: { name: { contains: `_${runId}` } }, select: { id: true } });
    const testRiderIds = testRiders.map((r) => r.id);

    const testOrders = await tx.order.findMany({
      where: {
        OR: [
          { customerId: { in: testCustomerIds } },
          { orderNumber: { startsWith: `QG-LT-${runId}` } }
        ]
      },
      select: { id: true }
    });
    const testOrderIds = testOrders.map((o) => o.id);

    console.log(`Purging ${testOrderIds.length} orders...`);

    // 2. Cascade delete order relations
    if (testOrderIds.length > 0) {
      await tx.orderStatusHistory.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.deliveryAssignment.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.paymentCollection.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.paymentReconciliationEvent.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.paymentReconciliationAlert.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.payment.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.supportTicketEvent.deleteMany({ where: { ticket: { orderId: { in: testOrderIds } } } });
      await tx.supportTicket.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.slaEvent.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.deliveryProof.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.invoiceReceipt.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.orderSubstitution.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await tx.foodSafetyIncident.deleteMany({ where: { orderId: { in: testOrderIds } } });

      await tx.order.deleteMany({ where: { id: { in: testOrderIds } } });
    }

    // 3. Delete general support tickets matching the runId subject
    const directTickets = await tx.supportTicket.findMany({ where: { subject: { contains: `_${runId}` } }, select: { id: true } });
    const directTicketIds = directTickets.map((t) => t.id);
    if (directTicketIds.length > 0) {
      await tx.supportTicketEvent.deleteMany({ where: { ticketId: { in: directTicketIds } } });
      await tx.supportTicket.deleteMany({ where: { id: { in: directTicketIds } } });
    }

    // 4. Delete Carts & Addresses
    await tx.cartItem.deleteMany({ where: { cart: { customerId: { in: testCustomerIds } } } });
    await tx.cart.deleteMany({ where: { customerId: { in: testCustomerIds } } });
    await tx.address.deleteMany({ where: { customerId: { in: testCustomerIds } } });

    // 5. Delete Customer profiles
    await tx.customer.deleteMany({ where: { id: { in: testCustomerIds } } });

    // 6. Delete Rider profiles
    if (testRiderIds.length > 0) {
      await tx.riderKycDocument.deleteMany({ where: { riderId: { in: testRiderIds } } });
      await tx.riderPayout.deleteMany({ where: { riderId: { in: testRiderIds } } });
      await tx.payout.deleteMany({ where: { riderId: { in: testRiderIds } } });
      await tx.rider.deleteMany({ where: { id: { in: testRiderIds } } });
    }

    // 7. Delete Vendor products and profiles
    if (testVendorIds.length > 0) {
      await tx.vendorStaff.deleteMany({ where: { vendorId: { in: testVendorIds } } });
      await tx.productPrice.deleteMany({ where: { product: { vendorId: { in: testVendorIds } } } });
      await tx.product.deleteMany({ where: { vendorId: { in: testVendorIds } } });
      await tx.vendorPayout.deleteMany({ where: { vendorId: { in: testVendorIds } } });
      await tx.settlement.deleteMany({ where: { vendorId: { in: testVendorIds } } });
      await tx.payout.deleteMany({ where: { vendorId: { in: testVendorIds } } });
      await tx.vendor.deleteMany({ where: { id: { in: testVendorIds } } });
    }

    // 8. Delete Users, roles, device sessions, and notifications
    if (testUserIds.length > 0) {
      await tx.userRole.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.otpSession.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.consentRecord.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.privacyRequest.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.auditLog.deleteMany({ where: { actorId: { in: testUserIds } } });
      await tx.deviceSession.deleteMany({ where: { userId: { in: testUserIds } } });

      await tx.user.deleteMany({ where: { id: { in: testUserIds } } });
    }

    // 9. Clean up service zones created for the run
    await tx.serviceZone.deleteMany({ where: { name: { contains: `_${runId}_` } } });
  });

  const finalStats = await getStats(runId);
  console.log("Cleanup transactions completed.");
  console.log(`Remaining synthetic records counts: ${JSON.stringify(finalStats)}`);
}

async function main() {
  enforceSafety();
  const runId = getEnv("LOADTEST_RUN_ID")!;
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  
  const isDryRun = arg2 === "--dry-run";

  if (arg1 === "seed") {
    await seed(runId, isDryRun);
  } else if (arg1 === "cleanup") {
    await cleanup(runId, isDryRun);
  } else {
    console.log("Usage: npx tsx performance/scripts/seed-staging.ts [seed|cleanup] [--dry-run]");
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error executing script:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
