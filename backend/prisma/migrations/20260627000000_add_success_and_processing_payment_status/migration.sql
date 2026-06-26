-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'UPI';
ALTER TYPE "PaymentMethod" ADD VALUE 'RAZORPAY';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'SUCCESS';
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "errorReason" TEXT,
ADD COLUMN     "gatewayOrderId" TEXT,
ADD COLUMN     "gatewayPaymentId" TEXT,
ADD COLUMN     "gatewaySignature" TEXT,
ADD COLUMN     "webhookPayload" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayOrderId_key" ON "Payment"("gatewayOrderId");
