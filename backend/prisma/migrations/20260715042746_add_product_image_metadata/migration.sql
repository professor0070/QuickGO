-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageMimeType" TEXT,
ADD COLUMN     "imageSizeBytes" INTEGER,
ADD COLUMN     "imageStorageKey" TEXT,
ADD COLUMN     "imageUpdatedAt" TIMESTAMP(3);
