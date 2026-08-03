-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OnboardingStatus" ADD VALUE 'TERMINATION_PENDING';
ALTER TYPE "OnboardingStatus" ADD VALUE 'AGREEMENT_TERMINATED';
ALTER TYPE "OnboardingStatus" ADD VALUE 'OFFBOARDED';
ALTER TYPE "OnboardingStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'ZONE_ADMIN';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "serviceZoneId" TEXT;

-- AlterTable
ALTER TABLE "RiderKycDocument" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "documentNumberEncrypted" TEXT,
ADD COLUMN     "documentNumberMasked" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "supersededByDocumentId" TEXT;

-- AlterTable
ALTER TABLE "ServiceZone" ADD COLUMN     "createdBySuperAdminId" TEXT,
ADD COLUMN     "operatingHours" TEXT,
ADD COLUMN     "polygonJson" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- AlterTable
ALTER TABLE "VendorComplianceDocument" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "documentNumberEncrypted" TEXT,
ADD COLUMN     "documentNumberMasked" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "supersededByDocumentId" TEXT;

-- CreateTable
CREATE TABLE "ServiceZonePincode" (
    "id" TEXT NOT NULL,
    "serviceZoneId" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceZonePincode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminZoneAssignment" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "serviceZoneId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedBySuperAdminId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,

    CONSTRAINT "AdminZoneAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerZoneAssignment" (
    "id" TEXT NOT NULL,
    "partnerUserId" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "serviceZoneId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerZoneAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
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
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceZonePincode_pincode_idx" ON "ServiceZonePincode"("pincode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceZonePincode_serviceZoneId_pincode_key" ON "ServiceZonePincode"("serviceZoneId", "pincode");

-- CreateIndex
CREATE INDEX "AdminZoneAssignment_adminUserId_idx" ON "AdminZoneAssignment"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminZoneAssignment_serviceZoneId_idx" ON "AdminZoneAssignment"("serviceZoneId");

-- CreateIndex
CREATE INDEX "PartnerZoneAssignment_partnerUserId_idx" ON "PartnerZoneAssignment"("partnerUserId");

-- CreateIndex
CREATE INDEX "PartnerZoneAssignment_serviceZoneId_idx" ON "PartnerZoneAssignment"("serviceZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_vendorId_key" ON "BankDetails"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_riderId_key" ON "BankDetails"("riderId");

-- CreateIndex
CREATE INDEX "AuditLog_serviceZoneId_idx" ON "AuditLog"("serviceZoneId");

-- AddForeignKey
ALTER TABLE "ServiceZonePincode" ADD CONSTRAINT "ServiceZonePincode_serviceZoneId_fkey" FOREIGN KEY ("serviceZoneId") REFERENCES "ServiceZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminZoneAssignment" ADD CONSTRAINT "AdminZoneAssignment_serviceZoneId_fkey" FOREIGN KEY ("serviceZoneId") REFERENCES "ServiceZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerZoneAssignment" ADD CONSTRAINT "PartnerZoneAssignment_serviceZoneId_fkey" FOREIGN KEY ("serviceZoneId") REFERENCES "ServiceZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
