import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const phone = "+917033475409";
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        status: "ACTIVE",
        isPhoneVerified: true,
      },
    });
  }

  const vendorRole = await prisma.role.findUnique({ where: { code: "VENDOR_OWNER" } });
  if (!vendorRole) throw new Error("VENDOR_OWNER role not found");

  const existingRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: vendorRole.id,
      },
    },
  });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: vendorRole.id,
      },
    });
  }

  const customerRole = await prisma.role.findUnique({ where: { code: "CUSTOMER" } });
  if (customerRole) {
    await prisma.userRole.deleteMany({
      where: {
        userId: user.id,
        roleId: customerRole.id,
      },
    });
  }

  // Link user as Vendor OWNER
  const vendorStaff = await prisma.vendorStaff.findUnique({
    where: {
      vendorId_userId: {
        vendorId: "00000000-0000-4000-9000-000000000002",
        userId: user.id,
      },
    },
  });

  if (!vendorStaff) {
    await prisma.vendorStaff.create({
      data: {
        vendorId: "00000000-0000-4000-9000-000000000002",
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });
  }

  console.log(`Fixture prepared: User ${phone} (ID: ${user.id}) holds only VENDOR_OWNER role and is OWNER of vendor 00000000-0000-4000-9000-000000000002.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
