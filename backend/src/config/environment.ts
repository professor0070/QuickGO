type Environment = "development" | "test" | "staging" | "production";

const ENVIRONMENTS = new Set<Environment>([
  "development",
  "test",
  "staging",
  "production"
]);

const DEPLOYED_ENVIRONMENTS = new Set<Environment>(["staging", "production"]);
const DEFAULT_DATABASE_URL = "postgresql://quickgo:quickgo@localhost:5432/quickgo_dev";
const DEFAULT_ACCESS_SECRET = "quickgo-local-access-secret-change-before-deploy";
const DEFAULT_REFRESH_SECRET = "quickgo-local-refresh-secret-change-before-deploy";
const SECRET_PLACEHOLDERS = new Set([
  "local-dev-secret",
  DEFAULT_ACCESS_SECRET,
  DEFAULT_REFRESH_SECRET,
  "replace-with-local-access-secret",
  "replace-with-local-refresh-secret"
]);

type EnvironmentValue = string | number | boolean;
type ValidatedEnvironment = Record<string, EnvironmentValue>;

export function validateEnvironment(config: Record<string, unknown>): ValidatedEnvironment {
  const errors: string[] = [];
  const nodeEnv = readEnvironment(config.NODE_ENV, errors);
  const deployed = DEPLOYED_ENVIRONMENTS.has(nodeEnv);

  const environment: ValidatedEnvironment = {
    NODE_ENV: nodeEnv,
    PORT: readPort(config.PORT, errors),
    DATABASE_URL: readDatabaseUrl(config.DATABASE_URL, deployed, errors),
    JWT_ACCESS_SECRET: readSecret(
      "JWT_ACCESS_SECRET",
      config.JWT_ACCESS_SECRET,
      DEFAULT_ACCESS_SECRET,
      deployed,
      errors
    ),
    JWT_REFRESH_SECRET: readSecret(
      "JWT_REFRESH_SECRET",
      config.JWT_REFRESH_SECRET,
      DEFAULT_REFRESH_SECRET,
      deployed,
      errors
    ),
    OTP_PROVIDER: readEnum("OTP_PROVIDER", config.OTP_PROVIDER, ["mock", "sms", "production"], "mock", errors),
    MOCK_OTP_CODE: readString(config.MOCK_OTP_CODE, "123456"),
    CLOUD_STORAGE_PROVIDER: readEnum(
      "CLOUD_STORAGE_PROVIDER",
      config.CLOUD_STORAGE_PROVIDER,
      ["cloudinary"],
      "cloudinary",
      errors
    ),
    CLOUDINARY_CLOUD_NAME: readRequiredWhenDeployed(
      "CLOUDINARY_CLOUD_NAME",
      config.CLOUDINARY_CLOUD_NAME,
      deployed,
      errors
    ),
    CLOUDINARY_API_KEY: readRequiredWhenDeployed(
      "CLOUDINARY_API_KEY",
      config.CLOUDINARY_API_KEY,
      deployed,
      errors
    ),
    CLOUDINARY_API_SECRET: readRequiredWhenDeployed(
      "CLOUDINARY_API_SECRET",
      config.CLOUDINARY_API_SECRET,
      deployed,
      errors
    ),
    FCM_SERVER_KEY_OR_SERVICE_ACCOUNT: readRequiredWhenDeployed(
      "FCM_SERVER_KEY_OR_SERVICE_ACCOUNT",
      config.FCM_SERVER_KEY_OR_SERVICE_ACCOUNT,
      deployed,
      errors
    ),
    ADMIN_APP_URL: readAdminOrigins(config.ADMIN_APP_URL, deployed, errors),
    CUSTOMER_APP_DEEPLINK: readString(config.CUSTOMER_APP_DEEPLINK, "quickgo://"),
    APP_VERSION: readString(config.APP_VERSION, "0.1.0"),
    FRESH_PRICE_MAX_AGE_HOURS: readPositiveNumber(
      "FRESH_PRICE_MAX_AGE_HOURS",
      config.FRESH_PRICE_MAX_AGE_HOURS,
      24,
      errors
    ),
    MVP_MANUAL_DISPATCH: readBoolean(config.MVP_MANUAL_DISPATCH, true),
    ORDER_CREATION_ENABLED: readBoolean(config.ORDER_CREATION_ENABLED, true),
    COD_ON_DELIVERY_ENABLED: readBoolean(config.COD_ON_DELIVERY_ENABLED, true),
    UPI_ON_DELIVERY_ENABLED: readBoolean(config.UPI_ON_DELIVERY_ENABLED, true),
    SUPPORT_INTAKE_ENABLED: readBoolean(config.SUPPORT_INTAKE_ENABLED, true),
    SERVICE_ZONE_LOCK_ENABLED: readBoolean(config.SERVICE_ZONE_LOCK_ENABLED, true),
    MAINTENANCE_MODE: readBoolean(config.MAINTENANCE_MODE, false),
    VENDOR_ORDER_ACCEPTANCE_ENABLED: readBoolean(
      config.VENDOR_ORDER_ACCEPTANCE_ENABLED,
      true
    ),
    RIDER_ASSIGNMENT_ENABLED: readBoolean(config.RIDER_ASSIGNMENT_ENABLED, true),
    PAYMENT_RECONCILIATION_ENABLED: readBoolean(
      config.PAYMENT_RECONCILIATION_ENABLED,
      true
    ),
    RAZORPAY_KEY_ID: readString(config.RAZORPAY_KEY_ID, "rzp_test_placeholder_key_id"),
    RAZORPAY_KEY_SECRET: readString(config.RAZORPAY_KEY_SECRET, "rzp_test_placeholder_key_secret"),
    RAZORPAY_WEBHOOK_SECRET: readString(config.RAZORPAY_WEBHOOK_SECRET, "rzp_test_placeholder_webhook_secret")
  };

  if (errors.length > 0) {
    throw new Error(`Invalid QuickGO environment:\n- ${errors.join("\n- ")}`);
  }

  return environment;
}

function readEnvironment(value: unknown, errors: string[]): Environment {
  const nodeEnv = readString(value, "development") as Environment;
  if (!ENVIRONMENTS.has(nodeEnv)) {
    errors.push("NODE_ENV must be development, test, staging, or production");
    return "development";
  }
  return nodeEnv;
}

function readPort(value: unknown, errors: string[]): number {
  const port = Number(readString(value, "3000"));
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    errors.push("PORT must be a valid TCP port");
    return 3000;
  }
  return port;
}

function readDatabaseUrl(value: unknown, deployed: boolean, errors: string[]): string {
  const databaseUrl = readString(value, deployed ? "" : DEFAULT_DATABASE_URL);
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required for deployed environments");
    return "";
  }
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    errors.push("DATABASE_URL must be a PostgreSQL connection string");
  }
  return databaseUrl;
}

function readSecret(
  key: string,
  value: unknown,
  fallback: string,
  deployed: boolean,
  errors: string[]
): string {
  const secret = readString(value, deployed ? "" : fallback);
  if (!secret) {
    errors.push(`${key} is required for deployed environments`);
    return "";
  }
  if (deployed && (secret.length < 32 || SECRET_PLACEHOLDERS.has(secret))) {
    errors.push(`${key} must be a non-placeholder secret of at least 32 characters`);
  }
  return secret;
}

function readRequiredWhenDeployed(
  key: string,
  value: unknown,
  deployed: boolean,
  errors: string[]
): string {
  const text = readString(value, "");
  if (deployed && !text) {
    errors.push(`${key} is required for deployed environments`);
  }
  return text;
}

function readAdminOrigins(value: unknown, deployed: boolean, errors: string[]): string {
  const origins = readString(value, "http://localhost:3001");
  const entries = origins.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (deployed && entries.length === 0) {
    errors.push("ADMIN_APP_URL is required for deployed environments");
  }
  for (const origin of entries) {
    if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
      errors.push("ADMIN_APP_URL must contain comma-separated HTTP(S) origins");
      break;
    }
  }
  return entries.join(",");
}

function readEnum<T extends string>(
  key: string,
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  errors: string[]
): T {
  const selected = readString(value, fallback) as T;
  if (!allowed.includes(selected)) {
    errors.push(`${key} must be one of: ${allowed.join(", ")}`);
    return fallback;
  }
  return selected;
}

function readPositiveNumber(
  key: string,
  value: unknown,
  fallback: number,
  errors: string[]
): number {
  const number = Number(readString(value, String(fallback)));
  if (!Number.isFinite(number) || number <= 0) {
    errors.push(`${key} must be a positive number`);
    return fallback;
  }
  return number;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const text = readString(value, String(fallback)).toLowerCase();
  return ["1", "true", "yes", "on"].includes(text);
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const text = value.trim();
  return text.length > 0 ? text : fallback;
}
