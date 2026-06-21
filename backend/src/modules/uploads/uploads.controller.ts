import {
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile as NestUploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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

const productImagePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: PRODUCT_IMAGE_MAX_BYTES }),
    new FileTypeValidator({ fileType: PRODUCT_IMAGE_TYPES })
  ]
});

const complianceDocumentPipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: COMPLIANCE_DOCUMENT_MAX_BYTES }),
    new FileTypeValidator({ fileType: COMPLIANCE_DOCUMENT_TYPES })
  ]
});

@Controller("admin")
@Roles("ADMIN", "SUPER_ADMIN")
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("products/:productId/image")
  @UseInterceptors(FileInterceptor("file"))
  async productImage(
    @CurrentUser() user: RequestUser,
    @Param("productId") productId: string,
    @Body() body: ProductImageUploadDto,
    @NestUploadedFile(productImagePipe) file: UploadedFile
  ) {
    return {
      data: await this.uploads.uploadProductImage(productId, file, body, user.id),
      message: "Product image uploaded"
    };
  }

  @Post("vendors/:vendorId/compliance-documents/upload")
  @UseInterceptors(FileInterceptor("file"))
  async vendorComplianceDocument(
    @CurrentUser() user: RequestUser,
    @Param("vendorId") vendorId: string,
    @Body() body: VendorComplianceUploadDto,
    @NestUploadedFile(complianceDocumentPipe) file: UploadedFile
  ) {
    return {
      data: await this.uploads.uploadVendorComplianceDocument(vendorId, file, body, user.id),
      message: "Vendor compliance document uploaded"
    };
  }

  @Post("riders/:riderId/kyc-documents/upload")
  @UseInterceptors(FileInterceptor("file"))
  async riderKycDocument(
    @CurrentUser() user: RequestUser,
    @Param("riderId") riderId: string,
    @Body() body: RiderKycUploadDto,
    @NestUploadedFile(complianceDocumentPipe) file: UploadedFile
  ) {
    return {
      data: await this.uploads.uploadRiderKycDocument(riderId, file, body, user.id),
      message: "Rider KYC document uploaded"
    };
  }
}
