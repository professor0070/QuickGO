-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarMimeType" TEXT,
ADD COLUMN     "avatarSizeBytes" INTEGER,
ADD COLUMN     "avatarStorageKey" TEXT,
ADD COLUMN     "avatarUpdatedAt" TIMESTAMP(3);
