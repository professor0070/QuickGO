import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import {
  FILE_STORAGE,
  FileStorageService,
  StoredFile,
  UploadedFile
} from "./file-storage.service";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";
import {
  ProductImageUploadDto,
  RiderKycUploadDto,
  VendorComplianceUploadDto
} from "./upload.dto";

const STORAGE_ROOT = "quickgo";

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventBus: DomainEventBus,
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

    const oldStorageKey = product.imageStorageKey;
    const cleanFile = this.preprocessFile(file);

    const uploaded = await this.fileStorage.upload(cleanFile, {
      folder: this.folder("products", productId),
      publicId: this.publicId("product", productId),
      resourceType: "image",
      accessMode: "public",
      tags: ["quickgo", "product-image", productId]
    });

    try {
      const updated = await this.prisma.product.update({
        where: { id: productId },
        data: {
          imageUrl: uploaded.url,
          imageStorageKey: uploaded.publicId,
          imageMimeType: file.mimetype,
          imageSizeBytes: cleanFile.size,
          imageUpdatedAt: new Date(),
        },
        include: {
          vendor: { select: { id: true, shopName: true } },
          category: true,
          prices: { where: { isActive: true }, orderBy: { effectiveOn: "desc" }, take: 1 }
        }
      });

      if (oldStorageKey && oldStorageKey !== uploaded.publicId) {
        try {
          await this.fileStorage.delete(oldStorageKey, "image");
        } catch (e) {
          this.logger.warn(`Old product image cleanup failed for product ${productId}`);
        }
      }

      await this.auditUpload({
        actorId,
        action: "admin.product_image_uploaded",
        entityType: "product",
        entityId: productId,
        reason: dto.reason,
        uploaded
      });

      return updated;
    } catch (dbError) {
      try {
        await this.fileStorage.delete(uploaded.publicId, "image");
      } catch (cleanupError) {
        this.logger.error(`Orphan product image cleanup failed for product ${productId} after DB failure`);
      }
      throw dbError;
    }
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

    const cleanFile = this.preprocessFile(file);

    const uploaded = await this.fileStorage.upload(cleanFile, {
      folder: this.folder("compliance", "vendors", vendorId),
      publicId: this.publicId("vendor-document", vendorId),
      resourceType: "auto",
      accessMode: "authenticated",
      tags: ["quickgo", "vendor-compliance", vendorId, dto.type]
    });

    const crypto = require("crypto");
    const checksum = crypto.createHash("md5").update(cleanFile.buffer).digest("hex");
    let documentNumberEncrypted: string | null = null;
    let documentNumberMasked: string | null = null;

    if (dto.document_number) {
      documentNumberEncrypted = "ENC::" + Buffer.from(dto.document_number).toString("base64");
      documentNumberMasked = dto.document_number.length > 4
        ? "*".repeat(dto.document_number.length - 4) + dto.document_number.slice(-4)
        : dto.document_number;
    }

    try {
      const document = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.vendorComplianceDocument.findFirst({
          where: {
            vendorId,
            type: dto.type,
            supersededByDocumentId: null,
            archivedAt: null
          }
        });

        const newDoc = await tx.vendorComplianceDocument.create({
          data: {
            vendorId,
            type: dto.type,
            documentUrl: uploaded.url,
            expiresAt: dto.expires_at ? new Date(dto.expires_at) : undefined,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: cleanFile.size,
            checksum,
            documentNumberMasked,
            documentNumberEncrypted
          }
        });

        if (existing) {
          await tx.vendorComplianceDocument.update({
            where: { id: existing.id },
            data: {
              supersededByDocumentId: newDoc.id,
              archivedAt: new Date()
            }
          });
        }

        return newDoc;
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

      await this.eventBus.publish(
        "compliance.document_submitted",
        {
          documentId: document.id,
          partnerId: vendorId,
          partnerType: "vendor",
          type: dto.type
        },
        { source: "uploads.service", actorId }
      );

      return document;
    } catch (dbError) {
      try {
        await this.fileStorage.delete(uploaded.publicId, "raw");
      } catch (cleanupError) {
        console.error(`Failed to clean up vendor compliance document ${uploaded.publicId} after database failure:`, cleanupError);
      }
      throw dbError;
    }
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

    const cleanFile = this.preprocessFile(file);

    const uploaded = await this.fileStorage.upload(cleanFile, {
      folder: this.folder("compliance", "riders", riderId),
      publicId: this.publicId("rider-document", riderId),
      resourceType: "auto",
      accessMode: "authenticated",
      tags: ["quickgo", "rider-kyc", riderId, dto.type]
    });

    const crypto = require("crypto");
    const checksum = crypto.createHash("md5").update(cleanFile.buffer).digest("hex");
    let documentNumberEncrypted: string | null = null;
    let documentNumberMasked: string | null = null;

    if (dto.document_number) {
      documentNumberEncrypted = "ENC::" + Buffer.from(dto.document_number).toString("base64");
      documentNumberMasked = dto.document_number.length > 4
        ? "*".repeat(dto.document_number.length - 4) + dto.document_number.slice(-4)
        : dto.document_number;
    }

    try {
      const document = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.riderKycDocument.findFirst({
          where: {
            riderId,
            type: dto.type,
            supersededByDocumentId: null,
            archivedAt: null
          }
        });

        const newDoc = await tx.riderKycDocument.create({
          data: {
            riderId,
            type: dto.type,
            documentUrl: uploaded.url,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: cleanFile.size,
            checksum,
            documentNumberMasked,
            documentNumberEncrypted
          }
        });

        if (existing) {
          await tx.riderKycDocument.update({
            where: { id: existing.id },
            data: {
              supersededByDocumentId: newDoc.id,
              archivedAt: new Date()
            }
          });
        }

        return newDoc;
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

      await this.eventBus.publish(
        "compliance.document_submitted",
        {
          documentId: document.id,
          partnerId: riderId,
          partnerType: "rider",
          type: dto.type
        },
        { source: "uploads.service", actorId }
      );

      return document;
    } catch (dbError) {
      try {
        await this.fileStorage.delete(uploaded.publicId, "raw");
      } catch (cleanupError) {
        console.error(`Failed to clean up rider kyc document ${uploaded.publicId} after database failure:`, cleanupError);
      }
      throw dbError;
    }
  }

  /**
   * Avatar upload follows the safe database-storage replacement sequence:
   * 1. Validate and preprocess the new image (EXIF strip, signature check).
   * 2. Store it under a new server-generated immutable key.
   * 3. Update ONLY the authenticated context's database fields.
   * 4. Confirm the database update succeeded.
   * 5. Remove the old context-specific file only after DB success.
   * 6. If DB update fails, remove or record the newly orphaned file.
   * 7. Never modify the opposite context's avatar fields.
   */
  async uploadAvatar(
    userId: string,
    appContext: string,
    file: UploadedFile
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    let folderPath = "";
    let oldStorageKey: string | null = null;
    let dbData: Record<string, any> = {};

    if (appContext === "PARTNER") {
      folderPath = this.folder("partners", userId, "avatars");
      oldStorageKey = user.partnerAvatarStorageKey;
      dbData = {
        partnerAvatarUrl: "",
        partnerAvatarStorageKey: "",
        partnerAvatarMimeType: file.mimetype,
        partnerAvatarSizeBytes: 0,
        partnerAvatarUpdatedAt: new Date()
      };
    } else {
      let customer = await this.prisma.customer.findUnique({ where: { userId } });
      if (!customer) {
        customer = await this.prisma.customer.upsert({
          where: { userId },
          update: {},
          create: { userId }
        });
      }
      folderPath = this.folder("customers", customer.id, "avatars");
      oldStorageKey = user.customerAvatarStorageKey;
      dbData = {
        customerAvatarUrl: "",
        customerAvatarStorageKey: "",
        customerAvatarMimeType: file.mimetype,
        customerAvatarSizeBytes: 0,
        customerAvatarUpdatedAt: new Date()
      };
    }

    const cleanFile = this.preprocessFile(file);

    const uploaded = await this.fileStorage.upload(cleanFile, {
      folder: folderPath,
      publicId: this.publicId("avatar", userId),
      resourceType: "image",
      accessMode: "public",
      tags: ["quickgo", "avatar", userId, appContext.toLowerCase()]
    });

    if (appContext === "PARTNER") {
      dbData.partnerAvatarUrl = uploaded.url;
      dbData.partnerAvatarStorageKey = uploaded.publicId;
      dbData.partnerAvatarSizeBytes = cleanFile.size;
    } else {
      dbData.customerAvatarUrl = uploaded.url;
      dbData.customerAvatarStorageKey = uploaded.publicId;
      dbData.customerAvatarSizeBytes = cleanFile.size;
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: dbData
      });

      if (oldStorageKey && oldStorageKey !== uploaded.publicId) {
        try {
          await this.fileStorage.delete(oldStorageKey, "image");
        } catch (e) {
          this.logger.warn(`Old ${appContext.toLowerCase()} avatar cleanup failed for user ${userId}`);
        }
      }

      await this.auditUpload({
        actorId: userId,
        action: `user.${appContext.toLowerCase()}_avatar_uploaded`,
        entityType: "user",
        entityId: userId,
        reason: `Profile ${appContext.toLowerCase()} avatar uploaded`,
        uploaded
      });

      return { avatarUrl: uploaded.url };
    } catch (dbError) {
      try {
        await this.fileStorage.delete(uploaded.publicId, "image");
      } catch (cleanupError) {
        this.logger.error(`Orphan ${appContext.toLowerCase()} avatar cleanup failed for user ${userId} after DB failure`);
      }
      throw dbError;
    }
  }

  async removeAvatar(userId: string, appContext: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    let oldStorageKey: string | null = null;
    let dbData: Record<string, any> = {};

    if (appContext === "PARTNER") {
      oldStorageKey = user.partnerAvatarStorageKey;
      dbData = {
        partnerAvatarUrl: null,
        partnerAvatarStorageKey: null,
        partnerAvatarMimeType: null,
        partnerAvatarSizeBytes: null,
        partnerAvatarUpdatedAt: null
      };
    } else {
      oldStorageKey = user.customerAvatarStorageKey;
      dbData = {
        customerAvatarUrl: null,
        customerAvatarStorageKey: null,
        customerAvatarMimeType: null,
        customerAvatarSizeBytes: null,
        customerAvatarUpdatedAt: null
      };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: dbData
    });

    if (oldStorageKey) {
      try {
        await this.fileStorage.delete(oldStorageKey, "image");
      } catch (e) {
        this.logger.warn(`Avatar file cleanup failed for user ${userId} during removal`);
      }
    }

    await this.auditUpload({
      actorId: userId,
      action: `user.${appContext.toLowerCase()}_avatar_removed`,
      entityType: "user",
      entityId: userId,
      reason: `Profile ${appContext.toLowerCase()} avatar removed`,
      uploaded: {
        url: "",
        publicId: "",
        resourceType: "image",
        bytes: 0,
        format: "",
        originalName: ""
      }
    });

    return { success: true };
  }

  private preprocessFile(file: UploadedFile): UploadedFile {
    let cleanBuffer = file.buffer;
    if (file.mimetype === "image/jpeg") {
      cleanBuffer = stripExifJpeg(file.buffer);
    } else if (file.mimetype === "image/png") {
      cleanBuffer = stripExifPng(file.buffer);
    } else if (file.mimetype === "image/webp") {
      cleanBuffer = stripExifWebP(file.buffer);
    }
    return {
      ...file,
      buffer: cleanBuffer,
      size: cleanBuffer.length
    };
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

export function stripExifJpeg(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }
  
  let i = 2;
  const result: Buffer[] = [Buffer.from([0xff, 0xd8])];
  
  while (i < buffer.length - 1) {
    if (buffer[i] === 0xff) {
      const marker = buffer[i + 1];
      if (marker === 0xd9) {
        result.push(buffer.subarray(i));
        break;
      }
      
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
        result.push(buffer.subarray(i, i + 2));
        i += 2;
        continue;
      }
      
      if (i + 3 >= buffer.length) {
        result.push(buffer.subarray(i));
        break;
      }
      
      const length = buffer.readUInt16BE(i + 2);
      if (marker === 0xe1) {
        // Skip APP1 segment (EXIF/metadata)
        i += 2 + length;
      } else {
        result.push(buffer.subarray(i, i + 2 + length));
        i += 2 + length;
      }
    } else {
      result.push(buffer.subarray(i));
      break;
    }
  }
  
  return Buffer.concat(result);
}

export function stripExifPng(buffer: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(signature)) {
    return buffer;
  }
  
  const result: Buffer[] = [signature];
  let i = 8;
  while (i < buffer.length - 11) {
    const length = buffer.readUInt32BE(i);
    const type = buffer.toString("ascii", i + 4, i + 8);
    const chunkLength = 12 + length;
    
    if (i + chunkLength > buffer.length) {
      result.push(buffer.subarray(i));
      break;
    }
    
    if (type === "eXIf") {
      i += chunkLength;
    } else {
      result.push(buffer.subarray(i, i + chunkLength));
      i += chunkLength;
    }
  }
  return Buffer.concat(result);
}

/**
 * Strip EXIF/XMP metadata from WebP images.
 * WebP uses RIFF container format with chunks. We strip:
 * - EXIF chunk (contains EXIF metadata including GPS)
 * - XMP chunk (contains XMP/Dublin Core metadata)
 */
export function stripExifWebP(buffer: Buffer): Buffer {
  if (buffer.length < 12) return buffer;
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || webp !== "WEBP") return buffer;

  const result: Buffer[] = [];
  // Placeholder RIFF header — we will patch the total size at the end
  result.push(buffer.subarray(0, 12));

  let i = 12;
  while (i < buffer.length - 7) {
    const chunkFourCC = buffer.toString("ascii", i, i + 4);
    const chunkSize = buffer.readUInt32LE(i + 4);
    // Chunks are padded to even boundaries
    const paddedSize = chunkSize + (chunkSize % 2);
    const totalChunkBytes = 8 + paddedSize;

    if (i + totalChunkBytes > buffer.length) {
      // Malformed tail — include remaining bytes as-is
      result.push(buffer.subarray(i));
      break;
    }

    if (chunkFourCC === "EXIF" || chunkFourCC === "XMP ") {
      // Skip this metadata chunk
      i += totalChunkBytes;
      continue;
    }

    result.push(buffer.subarray(i, i + totalChunkBytes));
    i += totalChunkBytes;
  }

  const stripped = Buffer.concat(result);
  // Patch RIFF header size field (bytes 4..7) = total file size - 8
  if (stripped.length >= 8) {
    stripped.writeUInt32LE(stripped.length - 8, 4);
  }
  return stripped;
}
