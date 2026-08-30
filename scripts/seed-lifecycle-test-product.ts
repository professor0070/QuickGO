import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vendorId = "00000000-0000-4000-9000-000000000002";
  const categoryCode = "RESTAURANT_FOOD";

  const category = await prisma.category.findUnique({ where: { code: categoryCode } });
  if (!category) throw new Error("Category RESTAURANT_FOOD not found");

  const product = await prisma.product.upsert({
    where: { id: "00000000-0000-4000-7000-000000000001" },
    update: {
      isApproved: true,
      isAvailable: true,
      approvalStatus: "APPROVED",
      mrp: 15.00,
    },
    create: {
      id: "00000000-0000-4000-7000-000000000001",
      vendorId,
      categoryId: category.id,
      name: "E2E Test Biryani",
      description: "Delicious biryani for lifecycle validation",
      unit: "Portion",
      isApproved: true,
      isAvailable: true,
      approvalStatus: "APPROVED",
      mrp: 15.00,
    },
  });

  const price = await prisma.productPrice.upsert({
    where: { id: "00000000-0000-4000-6000-000000000001" },
    update: {
      isActive: true,
      price: 12.00,
      mrp: 15.00,
    },
    create: {
      id: "00000000-0000-4000-6000-000000000001",
      productId: product.id,
      price: 12.00,
      mrp: 15.00,
      isActive: true,
    },
  });

  console.log(`Lifecycle test product seeded: ${product.name} (Price: ${price.price})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
