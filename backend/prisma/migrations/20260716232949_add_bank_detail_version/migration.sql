-- CreateTable
CREATE TABLE "BankDetailVersion" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "riderId" TEXT,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "bankName" TEXT,
    "branch" TEXT,
    "upiId" TEXT,
    "proofDocumentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetailVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankDetailVersion_vendorId_idx" ON "BankDetailVersion"("vendorId");

-- CreateIndex
CREATE INDEX "BankDetailVersion_riderId_idx" ON "BankDetailVersion"("riderId");
