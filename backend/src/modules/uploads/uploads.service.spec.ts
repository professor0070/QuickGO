import { Test, TestingModule } from "@nestjs/testing";
import { UploadsService, stripExifJpeg, stripExifPng } from "./uploads.service";
import { PrismaService } from "../common/prisma.service";
import { FILE_STORAGE, FileStorageService } from "./file-storage.service";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "../internal-events/domain-event-bus.service";

describe("UploadsService", () => {
  let service: UploadsService;
  let prisma: PrismaService;
  let fileStorage: FileStorageService;

  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
    },
    rider: {
      findUnique: jest.fn(),
    },
    vendorComplianceDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    riderKycDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockFileStorage = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfig = {
    getOrThrow: jest.fn().mockReturnValue("test"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FILE_STORAGE, useValue: mockFileStorage },
        { provide: ConfigService, useValue: mockConfig },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    prisma = module.get<PrismaService>(PrismaService);
    fileStorage = module.get<FileStorageService>(FILE_STORAGE);

    jest.clearAllMocks();
  });

  describe("EXIF Stripping Utility Functions", () => {
    it("should strip APP1 marker from JPEG buffers", () => {
      // Mock JPEG header: FF D8
      // APP1 segment: FF E1, length: 00 06 (6 bytes: length bytes + 4 bytes content), data: 41 42 43 44
      // Next data chunk (DQT): FF DB, length: 00 04, data: 01 02
      // End marker: FF D9
      const app1Segment = Buffer.from([0xff, 0xe1, 0x00, 0x06, 0x41, 0x42, 0x43, 0x44]);
      const nextSegment = Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x01, 0x02]);
      const jpegBuffer = Buffer.concat([
        Buffer.from([0xff, 0xd8]),
        app1Segment,
        nextSegment,
        Buffer.from([0xff, 0xd9]),
      ]);

      const stripped = stripExifJpeg(jpegBuffer);

      // The stripped buffer must still be valid JPEG but have no FFE1 APP1 block
      expect(stripped[0]).toBe(0xff);
      expect(stripped[1]).toBe(0xd8);
      expect(stripped.indexOf(Buffer.from([0xff, 0xe1]))).toBe(-1); // APP1 stripped!
      expect(stripped.indexOf(Buffer.from([0xff, 0xdb]))).toBeGreaterThan(0); // DQT remains!
    });

    it("should strip eXIf chunk from PNG buffers", () => {
      // PNG header: 89 50 4E 47 0D 0A 1A 0A
      // eXIf chunk: length 00 00 00 04 (4 bytes), type: eXIf (65 58 69 66), data: 01 02 03 04, crc: 00 00 00 00 (4 bytes)
      // IEND chunk: length 00 00 00 00, type: IEND
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const exifChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x04]),
        Buffer.from("eXIf", "ascii"),
        Buffer.from([0x01, 0x02, 0x03, 0x04]),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
      ]);
      const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from("IEND", "ascii"),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
      ]);

      const pngBuffer = Buffer.concat([pngHeader, exifChunk, iendChunk]);
      const stripped = stripExifPng(pngBuffer);

      expect(stripped.subarray(0, 8).equals(pngHeader)).toBe(true);
      expect(stripped.toString("ascii").indexOf("eXIf")).toBe(-1); // Chunk stripped!
      expect(stripped.toString("ascii").indexOf("IEND")).toBeGreaterThan(0); // IEND remains!
    });
  });

  describe("Database Failure Orphan Prevention Cleanup", () => {
    it("should clean up newly uploaded product image if database update throws", async () => {
      const mockProduct = { id: "p1", imageStorageKey: "old-key" };
      const mockFile = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockFileStorage.upload.mockResolvedValue({
        url: "http://storage.com/new-pic.jpg",
        publicId: "new-key",
      });
      // Database write fails
      mockPrisma.product.update.mockRejectedValue(new Error("Database connection timed out"));

      await expect(
        service.uploadProductImage("p1", mockFile as any, { reason: "testing" })
      ).rejects.toThrow("Database connection timed out");

      // Verify file was deleted from storage due to database write failure
      expect(fileStorage.delete).toHaveBeenCalledWith("new-key", "image");
      // Old key should NOT be deleted because transaction was aborted
      expect(fileStorage.delete).not.toHaveBeenCalledWith("old-key", "image");
    });

    it("should clean up newly uploaded avatar if user update throws", async () => {
      const mockUser = { id: "u1", avatarStorageKey: "old-avatar" };
      const mockFile = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      mockFileStorage.upload.mockResolvedValue({
        url: "http://storage.com/new-avatar.jpg",
        publicId: "new-avatar-key",
      });
      mockPrisma.user.update.mockRejectedValue(new Error("Database constraint violation"));

      await expect(
        service.uploadAvatar("u1", "CUSTOMER", mockFile as any)
      ).rejects.toThrow("Database constraint violation");

      // Verify file was cleaned up
      expect(fileStorage.delete).toHaveBeenCalledWith("new-avatar-key", "image");
      // Old key not deleted
      expect(fileStorage.delete).not.toHaveBeenCalledWith("old-avatar", "image");
    });
  });

  describe("Database-Storage Consistency (Section C)", () => {
    it("should handle DB success but old-file cleanup failure without data loss", async () => {
      const mockUser = {
        id: "u1",
        customerAvatarStorageKey: "old-customer-key",
      };
      const mockFile = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      mockFileStorage.upload.mockResolvedValue({
        url: "http://storage.com/new-avatar.jpg",
        publicId: "new-avatar-key",
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, customerAvatarUrl: "http://storage.com/new-avatar.jpg" });
      // Old file deletion fails
      mockFileStorage.delete.mockRejectedValue(new Error("Storage timeout"));

      const result = await service.uploadAvatar("u1", "CUSTOMER", mockFile as any);

      // Avatar URL should still be returned despite cleanup failure
      expect(result).toHaveProperty("avatarUrl");
      // Cleanup was attempted
      expect(fileStorage.delete).toHaveBeenCalledWith("old-customer-key", "image");
    });

    it("should clean up partner avatar orphan when DB fails", async () => {
      const mockUser = {
        id: "u1",
        partnerAvatarStorageKey: "old-partner-key",
      };
      const mockFile = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockFileStorage.upload.mockResolvedValue({
        url: "http://storage.com/new-partner-avatar.jpg",
        publicId: "new-partner-key",
      });
      mockPrisma.user.update.mockRejectedValue(new Error("DB unavailable"));

      await expect(
        service.uploadAvatar("u1", "PARTNER", mockFile as any)
      ).rejects.toThrow("DB unavailable");

      // Orphan cleanup of the NEW file (not old)
      expect(fileStorage.delete).toHaveBeenCalledWith("new-partner-key", "image");
      // Old partner key untouched
      expect(fileStorage.delete).not.toHaveBeenCalledWith("old-partner-key", "image");
    });

    it("should isolate CUSTOMER context from PARTNER fields during upload", async () => {
      const mockUser = {
        id: "u1",
        customerAvatarStorageKey: null,
        partnerAvatarStorageKey: "existing-partner-key",
      };
      const mockFile = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: "cust1" });
      mockFileStorage.upload.mockResolvedValue({
        url: "http://storage.com/customer-avatar.jpg",
        publicId: "customer-key",
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.uploadAvatar("u1", "CUSTOMER", mockFile as any);

      // Verify DB update was called with ONLY customer fields, not partner
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty("customerAvatarUrl");
      expect(updateCall.data).toHaveProperty("customerAvatarStorageKey");
      expect(updateCall.data).not.toHaveProperty("partnerAvatarUrl");
      expect(updateCall.data).not.toHaveProperty("partnerAvatarStorageKey");
    });

    it("should isolate PARTNER context from CUSTOMER fields during upload", async () => {
      const mockUser = {
        id: "u1",
        customerAvatarStorageKey: "existing-customer-key",
        partnerAvatarStorageKey: null,
      };
      const mockFile = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
        originalname: "avatar.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockFileStorage.upload.mockResolvedValue({
        url: "http://storage.com/partner-avatar.jpg",
        publicId: "partner-key",
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.uploadAvatar("u1", "PARTNER", mockFile as any);

      // Verify DB update was called with ONLY partner fields, not customer
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty("partnerAvatarUrl");
      expect(updateCall.data).toHaveProperty("partnerAvatarStorageKey");
      expect(updateCall.data).not.toHaveProperty("customerAvatarUrl");
      expect(updateCall.data).not.toHaveProperty("customerAvatarStorageKey");
    });

    it("should not delete partner avatar when removing customer avatar", async () => {
      const mockUser = {
        id: "u1",
        customerAvatarStorageKey: "customer-key-to-remove",
        partnerAvatarStorageKey: "partner-key-untouched",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      await service.removeAvatar("u1", "CUSTOMER");

      // Verify only customer key is cleaned up
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.customerAvatarUrl).toBeNull();
      expect(updateCall.data.customerAvatarStorageKey).toBeNull();
      expect(updateCall.data).not.toHaveProperty("partnerAvatarUrl");
      expect(updateCall.data).not.toHaveProperty("partnerAvatarStorageKey");

      expect(fileStorage.delete).toHaveBeenCalledWith("customer-key-to-remove", "image");
      expect(fileStorage.delete).not.toHaveBeenCalledWith("partner-key-untouched", "image");
    });
  });

  describe("WebP EXIF Stripping", () => {
    it("should strip EXIF chunk from WebP buffers", () => {
      const { stripExifWebP } = require("./uploads.service");

      // RIFF header + WEBP
      const riffHeader = Buffer.from("RIFF", "ascii");
      const riffSize = Buffer.alloc(4);
      const webpMarker = Buffer.from("WEBP", "ascii");

      // VP8 chunk (keep)
      const vp8Type = Buffer.from("VP8 ", "ascii");
      const vp8Data = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const vp8Size = Buffer.alloc(4);
      vp8Size.writeUInt32LE(4, 0);

      // EXIF chunk (strip)
      const exifType = Buffer.from("EXIF", "ascii");
      const exifData = Buffer.from([0x10, 0x20, 0x30, 0x40]);
      const exifSize = Buffer.alloc(4);
      exifSize.writeUInt32LE(4, 0);

      const body = Buffer.concat([
        vp8Type, vp8Size, vp8Data,
        exifType, exifSize, exifData,
      ]);
      riffSize.writeUInt32LE(4 + body.length, 0); // WEBP + body

      const webpBuffer = Buffer.concat([riffHeader, riffSize, webpMarker, body]);
      const stripped = stripExifWebP(webpBuffer);

      expect(stripped.toString("ascii", 0, 4)).toBe("RIFF");
      expect(stripped.toString("ascii", 8, 12)).toBe("WEBP");
      // EXIF chunk should be gone
      expect(stripped.toString("ascii").indexOf("EXIF")).toBe(-1);
      // VP8 chunk should remain
      expect(stripped.toString("ascii").indexOf("VP8 ")).toBeGreaterThan(0);
    });
  });
});
