import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import {
  FILE_STORAGE,
  FileStorageService,
  StoredFile,
  UploadedFile
} from "./file-storage.service";
import {
  ProductImageUploadDto,
  RiderKycUploadDto,
  VendorComplianceUploadDto
} from "./upload.dto";

const STORAGE_ROOT = "quickgo";

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorageService
  ) {}

  async uploadProductImage(
    productId: string,
    file: UploadedFile,
    dto: ProductImageUploadDto,
    actorId?: string
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const uploaded = await this.fileStorage.upload(file, {
      folder: this.folder("products", productId),
      publicId: this.publicId("product", productId),
      resourceType: "image",
      accessMode: "public",
      tags: ["quickgo", "product-image", productId]
    });

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: uploaded.url },
      include: {
        vendor: { select: { id: true, shopName: true } },
        category: true,
        prices: { where: { isActive: true }, orderBy: { effectiveOn: "desc" }, take: 1 }
      }
    });

    await this.auditUpload({
      actorId,
      action: "admin.product_image_uploaded",
      entityType: "product",
      entityId: productId,
      reason: dto.reason,
      uploaded
    });

    return updated;
  }

  async uploadVendorComplianceDocument(
    vendorId: string,
    file: UploadedFile,
    dto: VendorComplianceUploadDto,
    actorId?: string
  ) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const uploaded = await this.fileStorage.upload(file, {
      folder: this.folder("compliance", "vendors", vendorId),
      publicId: this.publicId("vendor-document", vendorId),
      resourceType: "auto",
      accessMode: "authenticated",
      tags: ["quickgo", "vendor-compliance", vendorId, dto.type]
    });

    const document = await this.prisma.vendorComplianceDocument.create({
      data: {
        vendorId,
        type: dto.type,
        documentUrl: uploaded.url,
        expiresAt: dto.expires_at ? new Date(dto.expires_at) : undefined
      }
    });

    await this.auditUpload({
      actorId,
      action: "admin.vendor_compliance_document_uploaded",
      entityType: "vendor_compliance_document",
      entityId: document.id,
      reason: dto.reason,
      uploaded,
      metadata: { vendorId, type: dto.type }
    });

    return document;
  }

  async uploadRiderKycDocument(
    riderId: string,
    file: UploadedFile,
    dto: RiderKycUploadDto,
    actorId?: string
  ) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) {
      throw new NotFoundException("Rider not found");
    }

    const uploaded = await this.fileStorage.upload(file, {
      folder: this.folder("compliance", "riders", riderId),
      publicId: this.publicId("rider-document", riderId),
      resourceType: "auto",
      accessMode: "authenticated",
      tags: ["quickgo", "rider-kyc", riderId, dto.type]
    });

    const document = await this.prisma.riderKycDocument.create({
      data: {
        riderId,
        type: dto.type,
        documentUrl: uploaded.url
      }
    });

    await this.auditUpload({
      actorId,
      action: "admin.rider_kyc_document_uploaded",
      entityType: "rider_kyc_document",
      entityId: document.id,
      reason: dto.reason,
      uploaded,
      metadata: { riderId, type: dto.type }
    });

    return document;
  }

  private auditUpload(input: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    reason: string;
    uploaded: StoredFile;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        metadata: {
          ...(input.metadata ?? {}),
          upload: {
            url: input.uploaded.url,
            publicId: input.uploaded.publicId,
            resourceType: input.uploaded.resourceType,
            bytes: input.uploaded.bytes,
            format: input.uploaded.format,
            originalName: input.uploaded.originalName
          }
        } as Prisma.InputJsonValue
      }
    });
  }

  private folder(...parts: string[]) {
    return [STORAGE_ROOT, this.config.getOrThrow<string>("NODE_ENV"), ...parts].join("/");
  }

  private publicId(prefix: string, entityId: string) {
    return `${prefix}-${entityId}-${Date.now()}`;
  }
}
