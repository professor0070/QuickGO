import { validateEnvironment } from "./environment";

describe("validateEnvironment", () => {
  it("applies safe local defaults for development", () => {
    const env = validateEnvironment({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toContain("quickgo_dev");
    expect(env.JWT_ACCESS_SECRET).toContain("change-before-deploy");
    expect(env.ORDER_CREATION_ENABLED).toBe(true);
    expect(env.MAINTENANCE_MODE).toBe(false);
  });

  it("requires deployed secrets and provider configuration", () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://quickgo:quickgo@db:5432/quickgo"
      })
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects placeholder secrets in deployed environments", () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: "staging",
        PORT: "3000",
        DATABASE_URL: "postgresql://quickgo:quickgo@db:5432/quickgo",
        JWT_ACCESS_SECRET: "replace-with-local-access-secret",
        JWT_REFRESH_SECRET: "replace-with-local-refresh-secret",
        CLOUDINARY_CLOUD_NAME: "quickgo",
        CLOUDINARY_API_KEY: "cloudinary-key",
        CLOUDINARY_API_SECRET: "cloudinary-secret",
        FCM_SERVER_KEY_OR_SERVICE_ACCOUNT: "firebase-service-account",
        ADMIN_APP_URL: "https://admin.quickgo.example"
      })
    ).toThrow(/non-placeholder secret/);
  });

  it("accepts explicit deployed configuration", () => {
    const env = validateEnvironment({
      NODE_ENV: "production",
      PORT: "8080",
      DATABASE_URL: "postgresql://quickgo:quickgo@db:5432/quickgo",
      JWT_ACCESS_SECRET: "x".repeat(32),
      JWT_REFRESH_SECRET: "y".repeat(32),
      CLOUDINARY_CLOUD_NAME: "quickgo",
      CLOUDINARY_API_KEY: "cloudinary-key",
      CLOUDINARY_API_SECRET: "cloudinary-secret",
      FCM_SERVER_KEY_OR_SERVICE_ACCOUNT: "firebase-service-account",
      ADMIN_APP_URL: "https://admin.quickgo.example",
      MAINTENANCE_MODE: "true"
    });

    expect(env.PORT).toBe(8080);
    expect(env.MAINTENANCE_MODE).toBe(true);
  });
});
