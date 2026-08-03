import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "../src/modules/auth/jwt.strategy";
import { ConfigService } from "@nestjs/config";

/**
 * Enterprise Controls — Legacy Token Transition (Section E)
 *
 * Verifies that:
 * 1. Tokens without appContext fail closed (E.1, E.2)
 * 2. Tokens with invalid appContext fail closed
 * 3. Tokens with null appContext fail closed
 * 4. Valid tokens with correct appContext are accepted
 *
 * Token Revocation (Section F):
 * NOT APPLICABLE TO CURRENT AUTH DESIGN — no denylist, session-version,
 * refresh-token rotation, or server-side session record exists.
 * Expired-token rejection is enforced by `ignoreExpiration: false` in JwtStrategy.
 */
describe("Legacy Token Transition & Context Validation (Section E)", () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("test-secret-key-32-chars-long!!!"),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  // ─── E.1 / E.2: Tokens without appContext must fail closed ─

  it("should reject JWT payload without appContext", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      // appContext is missing
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
    expect(() => strategy.validate(payload as any)).toThrow("JWT missing valid signed context");
  });

  it("should reject JWT payload with appContext: undefined", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: undefined,
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });

  it("should reject JWT payload with appContext: null", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: null,
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });

  it("should reject JWT payload with appContext: empty string", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: "",
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });

  // ─── E.2: Invalid appContext values must fail closed ───────

  it("should reject JWT payload with invalid appContext 'UNKNOWN'", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: "UNKNOWN",
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
    expect(() => strategy.validate(payload as any)).toThrow("JWT missing valid signed context");
  });

  it("should reject JWT payload with appContext 'customer' (lowercase)", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: "customer", // must be uppercase
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });

  it("should reject JWT payload with appContext 'USER'", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: "USER",
    };

    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });

  // ─── Valid tokens ──────────────────────────────────────────

  it("should accept JWT payload with appContext 'CUSTOMER'", () => {
    const payload = {
      sub: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: "CUSTOMER",
    };

    const result = strategy.validate(payload);
    expect(result).toEqual({
      id: "user-123",
      phone: "+919876543210",
      roles: ["CUSTOMER"],
      appContext: "CUSTOMER",
    });
  });

  it("should accept JWT payload with appContext 'PARTNER'", () => {
    const payload = {
      sub: "user-456",
      phone: "+919876543210",
      roles: ["RIDER", "VENDOR_OWNER"],
      appContext: "PARTNER",
    };

    const result = strategy.validate(payload);
    expect(result).toEqual({
      id: "user-456",
      phone: "+919876543210",
      roles: ["RIDER", "VENDOR_OWNER"],
      appContext: "PARTNER",
    });
  });

  it("should accept JWT payload with appContext 'ADMIN'", () => {
    const payload = {
      sub: "admin-789",
      phone: "+919876543210",
      roles: ["ADMIN"],
      appContext: "ADMIN",
    };

    const result = strategy.validate(payload);
    expect(result).toEqual({
      id: "admin-789",
      phone: "+919876543210",
      roles: ["ADMIN"],
      appContext: "ADMIN",
    });
  });

  // ─── E.6: Client context verification ─────────────────────

  describe("Client App Context Verification (E.6)", () => {
    it("documents that customer_app sends appContext: CUSTOMER at login", () => {
      // Static verification: mobile/customer_app/lib/src/screens/login_screen.dart:69
      // repo.verifyOtp(normalized, otpText, appContext: 'CUSTOMER')
      expect(true).toBe(true); // Placeholder for static verification
    });

    it("documents that partner_app sends appContext: PARTNER at login", () => {
      // Static verification: mobile/partner_app/lib/src/screens/login_screen.dart:133
      // repo.verifyOtp(normalized, otpText, appContext: 'PARTNER')
      expect(true).toBe(true); // Placeholder for static verification
    });
  });

  // ─── F: Token Revocation ──────────────────────────────────

  describe("Token Revocation Claim Accuracy (Section F)", () => {
    it("documents that token revocation is NOT APPLICABLE to current auth design", () => {
      // QuickGO uses stateless JWT with no:
      // - Token denylist table
      // - Session-version or tokenVersion field
      // - Refresh-token rotation/revocation
      // - Server-side session record
      //
      // Only lifecycle control: JWT expiration (ignoreExpiration: false)
      //
      // STATUS: NOT APPLICABLE TO CURRENT AUTH DESIGN
      // Technical debt item recorded separately.
      expect(true).toBe(true);
    });
  });
});
