-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'IN_APP',
ADD COLUMN     "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryMetadata" JSONB;

-- AlterTable
ALTER TABLE "SlaEvent" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_deliveryStatus_createdAt_idx" ON "Notification"("deliveryStatus", "createdAt");

-- CreateIndex
CREATE INDEX "SlaEvent_type_breached_resolvedAt_createdAt_idx" ON "SlaEvent"("type", "breached", "resolvedAt", "createdAt");
