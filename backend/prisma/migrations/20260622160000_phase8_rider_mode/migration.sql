-- Phase 8 Rider Mode additive schema updates.
CREATE TYPE "DeliveryProofStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

ALTER TABLE "DeliveryAssignment"
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "DeliveryProof"
ADD COLUMN "riderId" TEXT,
ADD COLUMN "status" "DeliveryProofStatus" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "DeliveryProof"
ADD CONSTRAINT "DeliveryProof_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliveryProof"
ADD CONSTRAINT "DeliveryProof_riderId_fkey"
FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DeliveryProof_riderId_createdAt_idx" ON "DeliveryProof"("riderId", "createdAt");
CREATE INDEX "DeliveryProof_status_createdAt_idx" ON "DeliveryProof"("status", "createdAt");
