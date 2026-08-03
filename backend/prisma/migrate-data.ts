import { PrismaClient } from "@prisma/client";

export async function runDataMigration(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? new PrismaClient();

  try {
    // 1. Migrate Customer-only legacy avatars (has Customer profile, no Partner profiles)
    const customerResult = await prisma.$executeRawUnsafe(`
      UPDATE "User" u
      SET
        "customerAvatarUrl" = u."avatarUrl",
        "customerAvatarStorageKey" = u."avatarStorageKey",
        "customerAvatarMimeType" = u."avatarMimeType",
        "customerAvatarSizeBytes" = u."avatarSizeBytes",
        "customerAvatarUpdatedAt" = COALESCE(u."avatarUpdatedAt", NOW())
      FROM "Customer" c
      WHERE u.id = c."userId"
        AND u."avatarUrl" IS NOT NULL
        AND u."customerAvatarUrl" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "Rider" r WHERE r."userId" = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM "VendorStaff" vs WHERE vs."userId" = u.id
        );
    `);

    // 2. Migrate Partner-only legacy avatars (has Rider/VendorStaff profile, no Customer profile)
    const partnerResult = await prisma.$executeRawUnsafe(`
      UPDATE "User" u
      SET
        "partnerAvatarUrl" = u."avatarUrl",
        "partnerAvatarStorageKey" = u."avatarStorageKey",
        "partnerAvatarMimeType" = u."avatarMimeType",
        "partnerAvatarSizeBytes" = u."avatarSizeBytes",
        "partnerAvatarUpdatedAt" = COALESCE(u."avatarUpdatedAt", NOW())
      WHERE u."avatarUrl" IS NOT NULL
        AND u."partnerAvatarUrl" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "Customer" c WHERE c."userId" = u.id
        )
        AND (
          EXISTS (SELECT 1 FROM "Rider" r WHERE r."userId" = u.id)
          OR EXISTS (SELECT 1 FROM "VendorStaff" vs WHERE vs."userId" = u.id)
        );
    `);

    return {
      customerMigrated: Number(customerResult),
      partnerMigrated: Number(partnerResult),
    };
  } finally {
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  runDataMigration()
    .then((res) => {
      console.log(`Successfully migrated ${res.customerMigrated} customer avatars and ${res.partnerMigrated} partner avatars.`);
    })
    .catch((e) => {
      console.error("Migration failed:", e);
      process.exit(1);
    });
}
