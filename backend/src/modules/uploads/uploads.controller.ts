import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Delete,
  Req,
  ForbiddenException,
  NotFoundException,
  Get,
  Res,
  Logger
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { FastifyRequest } from "fastify";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../common/prisma.service";
import { UploadedFile } from "./file-storage.service";
import {
  ProductImageUploadDto,
  RiderKycUploadDto,
  VendorComplianceUploadDto
} from "./upload.dto";
import { UploadsService } from "./uploads.service";

const PRODUCT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const COMPLIANCE_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = /^image\/(jpeg|png|webp)$/;
const COMPLIANCE_DOCUMENT_TYPES = /^(image\/(jpeg|png|webp)|application\/pdf)$/;

/** Maximum image dimensions to prevent decompression-bomb attacks. */
const IMAGE_MAX_WIDTH = 8192;
const IMAGE_MAX_HEIGHT = 8192;
const IMAGE_MAX_PIXELS = 32_000_000; // ~32 megapixels

/** Path-traversal and dangerous filename patterns. */
const DANGEROUS_PATH_PATTERN = /(\.\.\/|\.\.\/|\.\.\\|[\/\\]|\x00)/;

const FILE_SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (buffer) =>
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP",
  "application/pdf": (buffer) => buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-"
};

type UploadConstraint = {
  maxBytes: number;
  allowedTypes: RegExp;
};

type DtoClass<T extends object> = new () => T;

@Controller()
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly uploads: UploadsService,
    private readonly prisma: PrismaService
  ) {}

  @Post("admin/products/:productId/image")
  @Roles("ADMIN", "SUPER_ADMIN")
  async productImage(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Req() request: FastifyRequest
  ) {
    const upload = await this.parseUploadRequest(request, {
      maxBytes: PRODUCT_IMAGE_MAX_BYTES,
      allowedTypes: PRODUCT_IMAGE_TYPES
    });
    const body = this.parseFields(ProductImageUploadDto, upload.fields);

    return {
      data: await this.uploads.uploadProductImage(productId, upload.file, body, user.id),
      message: "Product image uploaded"
    };
  }

  @Post("admin/vendors/:vendorId/compliance-documents/upload")
  @Roles("ADMIN", "SUPER_ADMIN")
  async vendorComplianceDocument(
    @CurrentUser() user: RequestUser,
    @Param("vendorId") vendorId: string,
    @Req() request: FastifyRequest
  ) {
    const upload = await this.parseUploadRequest(request, {
      maxBytes: COMPLIANCE_DOCUMENT_MAX_BYTES,
      allowedTypes: COMPLIANCE_DOCUMENT_TYPES
    });
    const body = this.parseFields(VendorComplianceUploadDto, upload.fields);

    return {
      data: await this.uploads.uploadVendorComplianceDocument(vendorId, upload.file, body, user.id),
      message: "Vendor compliance document uploaded"
    };
  }

  @Post("admin/riders/:riderId/kyc-documents/upload")
  @Roles("ADMIN", "SUPER_ADMIN")
  async riderKycDocument(
    @CurrentUser() user: RequestUser,
    @Param("riderId") riderId: string,
    @Req() request: FastifyRequest
  ) {
    const upload = await this.parseUploadRequest(request, {
      maxBytes: COMPLIANCE_DOCUMENT_MAX_BYTES,
      allowedTypes: COMPLIANCE_DOCUMENT_TYPES
    });
    const body = this.parseFields(RiderKycUploadDto, upload.fields);

    return {
      data: await this.uploads.uploadRiderKycDocument(riderId, upload.file, body, user.id),
      message: "Rider KYC document uploaded"
    };
  }

  @Post("profile/avatar")
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @Req() request: FastifyRequest
  ) {
    const upload = await this.parseUploadRequest(request, {
      maxBytes: PRODUCT_IMAGE_MAX_BYTES,
      allowedTypes: PRODUCT_IMAGE_TYPES
    });
    return {
      data: await this.uploads.uploadAvatar(user.id, user.appContext, upload.file),
      message: "Profile picture updated"
    };
  }

  @Delete("profile/avatar")
  async removeAvatar(@CurrentUser() user: RequestUser) {
    return {
      data: await this.uploads.removeAvatar(user.id, user.appContext),
      message: "Profile picture removed"
    };
  }

  @Get("profile/avatar/media")
  async getAvatarMedia(
    @CurrentUser() user: RequestUser,
    @Res() res: any
  ) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id }
    });
    if (!dbUser) {
      throw new NotFoundException("User not found");
    }

    let url: string | null = null;
    let mimeType: string | null = null;

    if (user.appContext === "CUSTOMER") {
      url = dbUser.customerAvatarUrl;
      mimeType = dbUser.customerAvatarMimeType || "image/jpeg";
    } else if (user.appContext === "PARTNER") {
      url = dbUser.partnerAvatarUrl;
      mimeType = dbUser.partnerAvatarMimeType || "image/jpeg";
    } else {
      throw new ForbiddenException("Context not allowed");
    }

    if (!url) {
      throw new NotFoundException("Avatar not found");
    }

    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Vary", "Authorization");

    if (url.startsWith("/uploads/")) {
      const fs = require("fs");
      const path = require("path");
      const safePath = path.resolve(path.join(process.cwd(), "public", url));
      const allowedRoot = path.resolve(path.join(process.cwd(), "public", "uploads"));
      // Path-traversal guard: resolved path must be within the uploads directory
      if (!safePath.startsWith(allowedRoot)) {
        this.logger.warn(`Avatar path traversal blocked for user ${user.id}`);
        throw new NotFoundException("Avatar not found");
      }
      if (fs.existsSync(safePath)) {
        const buffer = fs.readFileSync(safePath);
        res.type(mimeType).send(buffer);
        return;
      }
    }

    if (url.startsWith("stored://") || url.startsWith("http")) {
      if (url.startsWith("http")) {
        try {
          const axios = require("axios");
          const response = await axios.get(url, { responseType: "arraybuffer" });
          res.type(mimeType || response.headers["content-type"]).send(Buffer.from(response.data));
          return;
        } catch (e) {
          this.logger.warn(`Remote avatar fetch failed for user ${user.id}`);
          // fallback to not found — do not expose remote URL in error
        }
      }
      throw new NotFoundException("Avatar not found");
    }

    throw new NotFoundException("Avatar not found");
  }

  @Post("partner/documents/upload")
  @Roles("RIDER", "VENDOR_OWNER", "VENDOR_STAFF")
  async partnerDocumentUpload(
    @CurrentUser() user: RequestUser,
    @Req() request: FastifyRequest
  ) {
    if (user.roles.includes("RIDER")) {
      const rider = await this.prisma.rider.findFirst({ where: { userId: user.id } });
      if (!rider) throw new NotFoundException("Rider profile not found");
      const upload = await this.parseUploadRequest(request, {
        maxBytes: COMPLIANCE_DOCUMENT_MAX_BYTES,
        allowedTypes: COMPLIANCE_DOCUMENT_TYPES
      });
      const body = this.parseFields(RiderKycUploadDto, upload.fields);
      return {
        data: await this.uploads.uploadRiderKycDocument(rider.id, upload.file, body, user.id),
        message: "Rider KYC document uploaded"
      };
    } else {
      const staff = await this.prisma.vendorStaff.findFirst({ where: { userId: user.id } });
      if (!staff) throw new NotFoundException("Vendor staff profile not found");
      const upload = await this.parseUploadRequest(request, {
        maxBytes: COMPLIANCE_DOCUMENT_MAX_BYTES,
        allowedTypes: COMPLIANCE_DOCUMENT_TYPES
      });
      const body = this.parseFields(VendorComplianceUploadDto, upload.fields);
      return {
        data: await this.uploads.uploadVendorComplianceDocument(staff.vendorId, upload.file, body, user.id),
        message: "Vendor compliance document uploaded"
      };
    }
  }

  @Post("vendor/products/:productId/image")
  @Roles("VENDOR_OWNER", "VENDOR_STAFF")
  async vendorProductImage(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Req() request: FastifyRequest
  ) {
    const staff = await this.prisma.vendorStaff.findFirst({ where: { userId: user.id } });
    if (!staff) throw new NotFoundException("Vendor profile not found");
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId: staff.vendorId }
    });
    if (!product) {
      throw new ForbiddenException("Access denied: You do not own this product");
    }
    const upload = await this.parseUploadRequest(request, {
      maxBytes: PRODUCT_IMAGE_MAX_BYTES,
      allowedTypes: PRODUCT_IMAGE_TYPES
    });
    const body = this.parseFields(ProductImageUploadDto, upload.fields);
    return {
      data: await this.uploads.uploadProductImage(productId, upload.file, body, user.id),
      message: "Product image uploaded"
    };
  }

  private async parseUploadRequest(
    request: FastifyRequest,
    constraint: UploadConstraint
  ): Promise<{ file: UploadedFile; fields: Record<string, string> }> {
    if (!request.isMultipart()) {
      throw new BadRequestException("Expected multipart/form-data");
    }

    const fields: Record<string, string> = {};
    let file: UploadedFile | undefined;

    try {
      for await (const part of request.parts({
        limits: {
          files: 1,
          fileSize: constraint.maxBytes,
          fields: 10,
          parts: 11
        }
      })) {
        if (part.type === "field") {
          fields[part.fieldname] = String(part.value ?? "");
          continue;
        }

        if (part.fieldname !== "file") {
          part.file.resume();
          throw new BadRequestException("Unexpected file field");
        }
        if (file) {
          part.file.resume();
          throw new BadRequestException("Only one file is allowed");
        }
        if (!constraint.allowedTypes.test(part.mimetype)) {
          part.file.resume();
          this.logger.warn(`Rejected upload: unsupported type ${part.mimetype}`);
          throw new BadRequestException("Unsupported file type");
        }

        const buffer = await part.toBuffer();
        if (buffer.byteLength > constraint.maxBytes) {
          this.logger.warn(`Rejected upload: size ${buffer.byteLength} exceeds limit ${constraint.maxBytes}`);
          throw new BadRequestException("File is too large");
        }
        this.assertFileSignature(part.mimetype, buffer);
        this.assertNotDangerousContent(buffer);
        this.assertSafeFilename(part.filename || "upload");

        // Validate image dimensions for raster image types
        if (PRODUCT_IMAGE_TYPES.test(part.mimetype)) {
          this.assertImageDimensions(buffer);
        }

        file = {
          buffer,
          originalname: this.sanitizeFilename(part.filename || "upload"),
          mimetype: part.mimetype,
          size: buffer.byteLength
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (this.isMultipartSizeError(error)) {
        throw new BadRequestException("File is too large");
      }
      throw error;
    }

    if (!file) {
      throw new BadRequestException("File is required");
    }

    return { file, fields };
  }

  private parseFields<T extends object>(dto: DtoClass<T>, fields: Record<string, string>): T {
    const body = plainToInstance(dto, fields);
    const errors = validateSync(body, {
      whitelist: true,
      forbidNonWhitelisted: true
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return body;
  }

  private isMultipartSizeError(error: unknown) {
    if (typeof error !== "object" || error === null || !("code" in error)) {
      return false;
    }

    const code = String((error as { code?: unknown }).code);
    return code === "FST_REQ_FILE_TOO_LARGE" || code === "LIMIT_FILE_SIZE";
  }

  private assertFileSignature(mimetype: string, buffer: Buffer) {
    const matches = FILE_SIGNATURES[mimetype];
    if (!matches || !matches(buffer)) {
      this.logger.warn(`Rejected upload: magic bytes mismatch for declared type ${mimetype}`);
      throw new BadRequestException("File content does not match declared type");
    }
  }

  /**
   * Reject SVG, HTML, XML, and script payloads that may be disguised as images.
   * Checks the first 512 bytes for dangerous content markers.
   */
  private assertNotDangerousContent(buffer: Buffer) {
    const header = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").toLowerCase();
    const dangerousMarkers = [
      "<svg", "<!doctype", "<html", "<script", "<?xml",
      "<iframe", "<object", "<embed", "<link",
      "javascript:", "vbscript:",
    ];
    for (const marker of dangerousMarkers) {
      if (header.includes(marker)) {
        this.logger.warn(`Rejected upload: dangerous content marker '${marker}' detected`);
        throw new BadRequestException("File contains prohibited content");
      }
    }
  }

  /**
   * Validate raster image dimensions and pixel count to prevent
   * decompression-bomb attacks (e.g., a 50000×50000 PNG).
   */
  private assertImageDimensions(buffer: Buffer) {
    try {
      const sizeOf = require("image-size");
      const dimensions = sizeOf.imageSize(buffer);
      if (!dimensions || !dimensions.width || !dimensions.height) {
        this.logger.warn("Rejected upload: unable to determine image dimensions");
        throw new BadRequestException("Unable to determine image dimensions");
      }
      if (dimensions.width > IMAGE_MAX_WIDTH || dimensions.height > IMAGE_MAX_HEIGHT) {
        this.logger.warn(`Rejected upload: dimensions ${dimensions.width}x${dimensions.height} exceed limit`);
        throw new BadRequestException(
          `Image dimensions exceed maximum (${IMAGE_MAX_WIDTH}×${IMAGE_MAX_HEIGHT})`
        );
      }
      const pixels = dimensions.width * dimensions.height;
      if (pixels > IMAGE_MAX_PIXELS) {
        this.logger.warn(`Rejected upload: pixel count ${pixels} exceeds limit ${IMAGE_MAX_PIXELS}`);
        throw new BadRequestException("Image pixel count exceeds safety limit");
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // If image-size cannot parse the header, the image may be corrupt
      this.logger.warn("Rejected upload: corrupt or unreadable image header");
      throw new BadRequestException("Image file appears corrupt or unreadable");
    }
  }

  /**
   * Reject filenames containing path-traversal sequences or null bytes.
   */
  private assertSafeFilename(filename: string) {
    if (DANGEROUS_PATH_PATTERN.test(filename)) {
      this.logger.warn(`Rejected upload: dangerous filename pattern detected`);
      throw new BadRequestException("Invalid filename");
    }
  }

  /**
   * Sanitize filename: strip path components, keep only basename.
   * Server-generated keys are used for storage; this is a defense-in-depth measure.
   */
  private sanitizeFilename(filename: string): string {
    // Extract basename only (strip any directory components)
    const basename = filename.replace(/^.*[\\/]/, "");
    // Remove null bytes and control characters
    return basename.replace(/[\x00-\x1f]/g, "").slice(0, 255) || "upload";
  }
}
