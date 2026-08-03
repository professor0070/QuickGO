import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary
} from "cloudinary";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

export const FILE_STORAGE = Symbol("FILE_STORAGE");
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf"
};

export type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type StoredFile = {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format?: string;
  originalName: string;
};

export type StoreFileOptions = {
  folder: string;
  publicId: string;
  resourceType: "image" | "raw" | "auto";
  accessMode: "public" | "authenticated";
  tags: string[];
};

export interface FileStorageService {
  upload(file: UploadedFile, options: StoreFileOptions): Promise<StoredFile>;
  delete(publicId: string, resourceType: string): Promise<void>;
}

export class LocalFileStorageService implements FileStorageService {
  async upload(file: UploadedFile, options: StoreFileOptions): Promise<StoredFile> {
    const dir = join(process.cwd(), "public", "uploads", options.folder);
    mkdirSync(dir, { recursive: true });
    const ext = EXTENSION_BY_MIME_TYPE[file.mimetype] ?? "bin";
    const filename = `${options.publicId}.${ext}`;
    const filePath = join(dir, filename);
    writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/${options.folder}/${filename}`,
      publicId: `${options.folder}/${options.publicId}`,
      resourceType: options.resourceType,
      bytes: file.size,
      format: ext,
      originalName: file.originalname
    };
  }

  async delete(publicId: string, resourceType: string): Promise<void> {
    const filePath = join(process.cwd(), "public", "uploads", publicId);
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      } else {
        // Fallback: publicId might have folder prefix or suffix. Let's check extensions too
        for (const ext of Object.values(EXTENSION_BY_MIME_TYPE)) {
          const pathWithExt = `${filePath}.${ext}`;
          if (existsSync(pathWithExt)) {
            unlinkSync(pathWithExt);
          }
        }
      }
    } catch (e) {
      console.error(`Failed to delete local file ${filePath}:`, e);
    }
  }
}

export class CloudinaryFileStorageService implements FileStorageService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.config.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.config.get<string>("CLOUDINARY_API_SECRET"),
      secure: true
    });
  }

  upload(file: UploadedFile, options: StoreFileOptions): Promise<StoredFile> {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.publicId,
          resource_type: options.resourceType,
          type: options.accessMode === "authenticated" ? "authenticated" : "upload",
          overwrite: true,
          tags: options.tags
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result?.secure_url || !result.public_id) {
            reject(new Error("Cloudinary did not return an uploaded file URL"));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format,
            originalName: file.originalname
          });
        }
      );

      stream.end(file.buffer);
    });
  }

  async delete(publicId: string, resourceType: string): Promise<void> {
    this.assertConfigured();
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        }
      );
    });
  }

  private assertConfigured() {
    const missing = [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET"
    ].filter((key) => !this.config.get<string>(key));

    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Cloudinary storage is not configured: ${missing.join(", ")}`
      );
    }
  }
}
