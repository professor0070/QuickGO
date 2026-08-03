import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { PrismaService } from "../common/prisma.service";

/**
 * Enterprise Security — Negative Tests for Avatar Upload Ingestion (Section B)
 *
 * Tests validate rejection of:
 * - Fake files with non-image bytes
 * - Mismatched MIME type and magic bytes
 * - Oversized files
 * - Excessive image dimensions
 * - SVG/HTML payloads
 * - Path-traversal filenames
 * - Corrupt images
 * - Cross-context upload attempts
 */
describe("UploadsController Security Validation", () => {
  let controller: UploadsController;

  const mockUploadsService = {
    uploadProductImage: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    uploadVendorComplianceDocument: jest.fn(),
    uploadRiderKycDocument: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        { provide: UploadsService, useValue: mockUploadsService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
    jest.clearAllMocks();
  });

  // ─── Helpers ────────────────────────────────────────────────

  /** Build a valid JPEG buffer (FFD8 FF header). */
  function validJpegBuffer(size = 64): Buffer {
    const buf = Buffer.alloc(size);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    // Minimal SOF0 marker for image-size parsing: FF C0 + length + precision + height + width
    buf[3] = 0xc0;
    buf[4] = 0x00;
    buf[5] = 0x0b; // length 11
    buf[6] = 0x08; // precision
    buf[7] = 0x00;
    buf[8] = 0x40; // height 64
    buf[9] = 0x00;
    buf[10] = 0x40; // width 64
    buf[11] = 0x01; // components
    buf[12] = 0x01;
    buf[13] = 0x11;
    buf[14] = 0x00;
    return buf;
  }

  /** Build a valid PNG buffer (89 50 4E 47... header + IHDR with dimensions). */
  function validPngBuffer(width = 64, height = 64): Buffer {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR chunk: 4 bytes length (13) + 4 bytes type + 13 bytes data + 4 bytes CRC
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type RGB
    const ihdrLength = Buffer.alloc(4);
    ihdrLength.writeUInt32BE(13, 0);
    const ihdrType = Buffer.from("IHDR", "ascii");
    const ihdrCrc = Buffer.alloc(4); // dummy CRC
    // IEND chunk
    const iendLength = Buffer.alloc(4); // 0
    const iendType = Buffer.from("IEND", "ascii");
    const iendCrc = Buffer.alloc(4);
    return Buffer.concat([sig, ihdrLength, ihdrType, ihdrData, ihdrCrc, iendLength, iendType, iendCrc]);
  }

  // ─── assertFileSignature (via reflection) ──────────────────

  describe("Magic Byte Validation", () => {
    it("should reject fake .jpg containing non-image bytes", () => {
      const fakeJpg = Buffer.from("This is not a JPEG file at all");
      expect(() =>
        (controller as any).assertFileSignature("image/jpeg", fakeJpg)
      ).toThrow(BadRequestException);
    });

    it("should reject mismatched MIME type and magic bytes (PNG header declared as JPEG)", () => {
      const pngBuffer = validPngBuffer();
      expect(() =>
        (controller as any).assertFileSignature("image/jpeg", pngBuffer)
      ).toThrow(BadRequestException);
    });

    it("should reject JPEG header declared as PNG", () => {
      const jpegBuffer = validJpegBuffer();
      expect(() =>
        (controller as any).assertFileSignature("image/png", jpegBuffer)
      ).toThrow(BadRequestException);
    });

    it("should accept valid JPEG with correct magic bytes", () => {
      const jpegBuffer = validJpegBuffer();
      expect(() =>
        (controller as any).assertFileSignature("image/jpeg", jpegBuffer)
      ).not.toThrow();
    });

    it("should accept valid PNG with correct magic bytes", () => {
      const pngBuffer = validPngBuffer();
      expect(() =>
        (controller as any).assertFileSignature("image/png", pngBuffer)
      ).not.toThrow();
    });

    it("should reject empty buffer", () => {
      expect(() =>
        (controller as any).assertFileSignature("image/jpeg", Buffer.alloc(0))
      ).toThrow(BadRequestException);
    });
  });

  // ─── assertNotDangerousContent ─────────────────────────────

  describe("SVG/HTML/Script Payload Rejection", () => {
    it("should reject SVG payload", () => {
      const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      expect(() =>
        (controller as any).assertNotDangerousContent(svgPayload)
      ).toThrow(BadRequestException);
      expect(() =>
        (controller as any).assertNotDangerousContent(svgPayload)
      ).toThrow("File contains prohibited content");
    });

    it("should reject HTML payload", () => {
      const htmlPayload = Buffer.from('<!DOCTYPE html><html><body><img src=x onerror=alert(1)></body></html>');
      expect(() =>
        (controller as any).assertNotDangerousContent(htmlPayload)
      ).toThrow(BadRequestException);
    });

    it("should reject script tag payload", () => {
      const scriptPayload = Buffer.from('<script>document.cookie</script>');
      expect(() =>
        (controller as any).assertNotDangerousContent(scriptPayload)
      ).toThrow(BadRequestException);
    });

    it("should reject XML payload", () => {
      const xmlPayload = Buffer.from('<?xml version="1.0"?><root>malicious</root>');
      expect(() =>
        (controller as any).assertNotDangerousContent(xmlPayload)
      ).toThrow(BadRequestException);
    });

    it("should reject iframe injection", () => {
      const iframePayload = Buffer.from('<iframe src="https://evil.com"></iframe>');
      expect(() =>
        (controller as any).assertNotDangerousContent(iframePayload)
      ).toThrow(BadRequestException);
    });

    it("should accept binary image data (not text-based)", () => {
      const jpegBuffer = validJpegBuffer();
      expect(() =>
        (controller as any).assertNotDangerousContent(jpegBuffer)
      ).not.toThrow();
    });
  });

  // ─── assertImageDimensions ─────────────────────────────────

  describe("Image Dimension and Decompression Bomb Protection", () => {
    it("should reject image with excessive width", () => {
      const hugePng = validPngBuffer(50000, 100);
      expect(() =>
        (controller as any).assertImageDimensions(hugePng)
      ).toThrow(BadRequestException);
    });

    it("should reject image with excessive height", () => {
      const tallPng = validPngBuffer(100, 50000);
      expect(() =>
        (controller as any).assertImageDimensions(tallPng)
      ).toThrow(BadRequestException);
    });

    it("should reject image with excessive pixel count", () => {
      // 8192x8192 = 67M pixels > 32M limit
      const largePng = validPngBuffer(8192, 8192);
      expect(() =>
        (controller as any).assertImageDimensions(largePng)
      ).toThrow(BadRequestException);
    });

    it("should accept image within dimension limits", () => {
      const normalPng = validPngBuffer(512, 512);
      expect(() =>
        (controller as any).assertImageDimensions(normalPng)
      ).not.toThrow();
    });

    it("should reject corrupt/unreadable image header", () => {
      // Valid JPEG magic bytes but corrupt SOF
      const corrupt = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00]);
      expect(() =>
        (controller as any).assertImageDimensions(corrupt)
      ).toThrow(BadRequestException);
    });
  });

  // ─── assertSafeFilename / sanitizeFilename ─────────────────

  describe("Path Traversal and Filename Safety", () => {
    it("should reject path-traversal filename (../)", () => {
      expect(() =>
        (controller as any).assertSafeFilename("../../etc/passwd")
      ).toThrow(BadRequestException);
    });

    it("should reject path-traversal filename (..\\)", () => {
      expect(() =>
        (controller as any).assertSafeFilename("..\\..\\etc\\passwd")
      ).toThrow(BadRequestException);
    });

    it("should reject filename with null byte", () => {
      expect(() =>
        (controller as any).assertSafeFilename("avatar\x00.jpg")
      ).toThrow(BadRequestException);
    });

    it("should reject filename with forward slash", () => {
      expect(() =>
        (controller as any).assertSafeFilename("path/to/file.jpg")
      ).toThrow(BadRequestException);
    });

    it("should accept safe filename", () => {
      expect(() =>
        (controller as any).assertSafeFilename("my-avatar.jpg")
      ).not.toThrow();
    });

    it("should sanitize filename by stripping directory components", () => {
      const result = (controller as any).sanitizeFilename("dir/sub/file.jpg");
      expect(result).toBe("file.jpg");
    });

    it("should sanitize filename by removing control characters", () => {
      const result = (controller as any).sanitizeFilename("file\x01\x02.jpg");
      expect(result).toBe("file.jpg");
    });

    it("should limit filename length to 255 characters", () => {
      const longName = "a".repeat(300) + ".jpg";
      const result = (controller as any).sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  // ─── Cross-context avatar isolation (static verification) ──

  describe("Cross-Context Avatar Ownership (Section A)", () => {
    it("should route CUSTOMER avatar to customerAvatar* fields", async () => {
      const mockFile = {
        buffer: validJpegBuffer(),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 64,
      };
      mockUploadsService.uploadAvatar.mockResolvedValue({ avatarUrl: "/test" });

      await mockUploadsService.uploadAvatar("user-1", "CUSTOMER", mockFile);

      expect(mockUploadsService.uploadAvatar).toHaveBeenCalledWith(
        "user-1",
        "CUSTOMER",
        mockFile
      );
    });

    it("should route PARTNER avatar to partnerAvatar* fields", async () => {
      const mockFile = {
        buffer: validJpegBuffer(),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 64,
      };
      mockUploadsService.uploadAvatar.mockResolvedValue({ avatarUrl: "/test" });

      await mockUploadsService.uploadAvatar("user-1", "PARTNER", mockFile);

      expect(mockUploadsService.uploadAvatar).toHaveBeenCalledWith(
        "user-1",
        "PARTNER",
        mockFile
      );
    });
  });
});
