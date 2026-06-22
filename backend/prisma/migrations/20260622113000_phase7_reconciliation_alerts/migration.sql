CREATE TYPE "ReconciliationAlertType" AS ENUM ('COLLECTION_PENDING', 'AMOUNT_MISMATCH', 'PAYMENT_DISPUTE');

CREATE TYPE "ReconciliationAlertStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "PaymentReconciliationAlert" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "type" "ReconciliationAlertType" NOT NULL,
    "status" "ReconciliationAlertStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "expectedAmount" DECIMAL(10,2),
    "collectedAmount" DECIMAL(10,2),
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReconciliationAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentReconciliationAlert_status_severity_createdAt_idx" ON "PaymentReconciliationAlert"("status", "severity", "createdAt");

CREATE INDEX "PaymentReconciliationAlert_orderId_status_idx" ON "PaymentReconciliationAlert"("orderId", "status");

CREATE INDEX "PaymentReconciliationAlert_paymentId_status_idx" ON "PaymentReconciliationAlert"("paymentId", "status");

CREATE INDEX "PaymentReconciliationAlert_type_status_createdAt_idx" ON "PaymentReconciliationAlert"("type", "status", "createdAt");

ALTER TABLE "PaymentReconciliationAlert" ADD CONSTRAINT "PaymentReconciliationAlert_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentReconciliationAlert" ADD CONSTRAINT "PaymentReconciliationAlert_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
