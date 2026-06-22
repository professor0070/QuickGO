import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Req
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { FastifyRequest } from "fastify";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { Roles } from "../../common/auth/roles.decorator";
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

@Controller("admin")
@Roles("ADMIN", "SUPER_ADMIN")
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("products/:productId/image")
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

  @Post("vendors/:vendorId/compliance-documents/upload")
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

  @Post("riders/:riderId/kyc-documents/upload")
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
          throw new BadRequestException("Unsupported file type");
        }

        const buffer = await part.toBuffer();
        if (buffer.byteLength > constraint.maxBytes) {
          throw new BadRequestException("File is too large");
        }
        this.assertFileSignature(part.mimetype, buffer);
        file = {
          buffer,
          originalname: part.filename || "upload",
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
      throw new BadRequestException("File content does not match declared type");
    }
  }
}
