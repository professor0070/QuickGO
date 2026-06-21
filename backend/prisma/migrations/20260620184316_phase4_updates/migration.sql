-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductCategoryCode" ADD VALUE 'MEAT';
ALTER TYPE "ProductCategoryCode" ADD VALUE 'FISH';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "substitutionNote" TEXT,
ADD COLUMN     "substitutionStatus" TEXT DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "freshnessStatus" TEXT NOT NULL DEFAULT 'FRESH',
ADD COLUMN     "margin" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "mrp" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shelfLifeDays" INTEGER;

-- AlterTable
ALTER TABLE "ProductPrice" ADD COLUMN     "mrp" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderSubstitution" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "originalProductId" TEXT NOT NULL,
    "substitutedProductId" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(10,3) NOT NULL,
    "fulfilledQuantity" DECIMAL(10,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemQualityIssue" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItemQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAuditEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodSafetyIncident" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodSafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutAdjustment" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReceipt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReceipt_orderId_key" ON "InvoiceReceipt"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReceipt_invoiceNumber_key" ON "InvoiceReceipt"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "OrderSubstitution" ADD CONSTRAINT "OrderSubstitution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSafetyIncident" ADD CONSTRAINT "FoodSafetyIncident_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutAdjustment" ADD CONSTRAINT "PayoutAdjustment_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReceipt" ADD CONSTRAINT "InvoiceReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
