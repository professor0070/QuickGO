import { PrismaClient, ProductCategoryCode, RoleCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const code of Object.values(RoleCode)) {
    await prisma.role.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code
          .split("_")
          .map((part) => part[0] + part.slice(1).toLowerCase())
          .join(" ")
      }
    });
  }

  const categories: Array<{
    code: ProductCategoryCode;
    name: string;
    sortOrder: number;
    isFresh: boolean;
  }> = [
    { code: "RESTAURANT_FOOD", name: "Restaurant Food", sortOrder: 1, isFresh: false },
    { code: "VEGETABLES", name: "Vegetables", sortOrder: 2, isFresh: true },
    { code: "FRUITS", name: "Fruits", sortOrder: 3, isFresh: true },
    { code: "DAIRY", name: "Dairy", sortOrder: 4, isFresh: true }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: category,
      create: category
    });
  }

  await prisma.serviceZone.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "QuickGO Launch Zone",
      city: "Jhajha",
      state: "Bihar",
      centerLatitude: 24.775,
      centerLongitude: 86.38,
      radiusKm: 3.0,
      isActive: true
    }
  });

  // Store seed phones in normalized +91XXXXXXXXXX format to avoid duplicates
  const superAdmin = await prisma.user.upsert({
    where: { phone: "+919999999999" },
    update: {},
    create: {
      phone: "+919999999999",
      status: "ACTIVE"
    }
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SUPER_ADMIN" }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRole.id
    }
  });

  // Developer/admin seed - use normalized format +91XXXXXXXXXX. This is seed-only.
  const devAdmin = await prisma.user.upsert({
    where: { phone: "+917033475405" },
    update: {},
    create: {
      phone: "+917033475405",
      status: "ACTIVE"
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: devAdmin.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: devAdmin.id,
      roleId: superAdminRole.id
    }
  });

  const standardAdmin = await prisma.user.upsert({
    where: { phone: "+918084901376" },
    update: {},
    create: {
      phone: "+918084901376",
      status: "ACTIVE"
    }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADMIN" }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: standardAdmin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: standardAdmin.id,
      roleId: adminRole.id
    }
  });

  const riderRole = await prisma.role.findUniqueOrThrow({
    where: { code: "RIDER" }
  });
  const vendorOwnerRole = await prisma.role.findUniqueOrThrow({
    where: { code: "VENDOR_OWNER" }
  });
  const customerRole = await prisma.role.findUniqueOrThrow({
    where: { code: "CUSTOMER" }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: devAdmin.id, roleId: riderRole.id } },
    update: {},
    create: { userId: devAdmin.id, roleId: riderRole.id }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: devAdmin.id, roleId: vendorOwnerRole.id } },
    update: {},
    create: { userId: devAdmin.id, roleId: vendorOwnerRole.id }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: devAdmin.id, roleId: customerRole.id } },
    update: {},
    create: { userId: devAdmin.id, roleId: customerRole.id }
  });

  await prisma.rider.upsert({
    where: { userId: devAdmin.id },
    update: {},
    create: {
      userId: devAdmin.id,
      name: "Dev Test Rider",
      phone: "+917033475405",
      vehicleType: "Two Wheeler",
      vehicleNumber: "JH-15-A-1234",
      serviceZoneId: "00000000-0000-4000-8000-000000000001",
      isOnline: true,
      status: "APPROVED",
      onboardingStatus: "APPROVED"
    }
  });

  const vendor = await prisma.vendor.upsert({
    where: { id: "00000000-0000-4000-9000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-9000-000000000001",
      shopName: "Dev Test Kitchen",
      ownerName: "Dev Admin",
      ownerPhone: "+917033475405",
      categoryCode: "RESTAURANT_FOOD",
      serviceZoneId: "00000000-0000-4000-8000-000000000001",
      addressLine: "Jhajha Main Road",
      city: "Jhajha",
      state: "Bihar",
      isOpen: true,
      status: "APPROVED",
      onboardingStatus: "APPROVED"
    }
  });

  await prisma.vendorStaff.upsert({
    where: { vendorId_userId: { vendorId: vendor.id, userId: devAdmin.id } },
    update: {},
    create: {
      vendorId: vendor.id,
      userId: devAdmin.id,
      role: "OWNER",
      status: "ACTIVE"
    }
  });


  await prisma.appVersion.upsert({
    where: { app_platform: { app: "CUSTOMER_APP", platform: "ANDROID" } },
    update: {},
    create: {
      app: "CUSTOMER_APP",
      platform: "ANDROID",
      minVersion: "1.0.0",
      latestVersion: "1.0.0"
    }
  });

  await prisma.appVersion.upsert({
    where: { app_platform: { app: "PARTNER_APP", platform: "ANDROID" } },
    update: {},
    create: {
      app: "PARTNER_APP",
      platform: "ANDROID",
      minVersion: "1.0.0",
      latestVersion: "1.0.0"
    }
  });

  await prisma.featureFlag.upsert({
    where: { key: "MVP_MANUAL_DISPATCH" },
    update: { enabled: true },
    create: {
      key: "MVP_MANUAL_DISPATCH",
      enabled: true,
      metadata: { mode: "manual" }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

