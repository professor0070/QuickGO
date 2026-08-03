-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customerAvatarMimeType" TEXT,
ADD COLUMN     "customerAvatarSizeBytes" INTEGER,
ADD COLUMN     "customerAvatarStorageKey" TEXT,
ADD COLUMN     "customerAvatarUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "customerAvatarUrl" TEXT,
ADD COLUMN     "partnerAvatarMimeType" TEXT,
ADD COLUMN     "partnerAvatarSizeBytes" INTEGER,
ADD COLUMN     "partnerAvatarStorageKey" TEXT,
ADD COLUMN     "partnerAvatarUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "partnerAvatarUrl" TEXT;
