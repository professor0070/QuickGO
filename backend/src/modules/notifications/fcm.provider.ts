import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

export type PushDispatchResult = {
  attemptedTokens: number;
  successCount: number;
  failureCount: number;
  simulated: boolean;
  error?: string;
};

@Injectable()
export class FcmProvider implements OnModuleInit {
  private readonly logger = new Logger(FcmProvider.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const creds = this.config.get<string>("FCM_SERVER_KEY_OR_SERVICE_ACCOUNT");
    if (!creds) {
      this.logger.warn("FCM_SERVER_KEY_OR_SERVICE_ACCOUNT not configured. FCM notifications will be simulated.");
      return;
    }

    try {
      if (admin.apps.length === 0) {
        let credentialObj;
        if (creds.trim().startsWith("{")) {
          credentialObj = admin.credential.cert(JSON.parse(creds));
        } else {
          // Fallback or server key
          credentialObj = admin.credential.applicationDefault();
        }
        admin.initializeApp({
          credential: credentialObj,
        });
        this.initialized = true;
        this.logger.log("Firebase Admin successfully initialized for FCM.");
      } else {
        this.initialized = true;
      }
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", error);
    }
  }

  async sendToDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<PushDispatchResult> {
    if (tokens.length === 0) {
      return {
        attemptedTokens: 0,
        successCount: 0,
        failureCount: 0,
        simulated: !this.initialized
      };
    }

    this.logger.log(`[FCM] Sending push notification to ${tokens.length} devices: "${title}" - "${body}"`);

    if (!this.initialized) {
      this.logger.log("[FCM] Simulated push notification success (firebase-admin unconfigured).");
      return {
        attemptedTokens: tokens.length,
        successCount: tokens.length,
        failureCount: 0,
        simulated: true
      };
    }

    try {
      const payload: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data ? this.sanitizeData(data) : undefined,
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      this.logger.log(`[FCM] Successfully sent FCM batch: success=${response.successCount}, failure=${response.failureCount}`);
      return {
        attemptedTokens: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        simulated: false
      };
    } catch (error) {
      this.logger.error("[FCM] Error sending multicast message via Firebase Admin", error);
      return {
        attemptedTokens: tokens.length,
        successCount: 0,
        failureCount: tokens.length,
        simulated: false,
        error: error instanceof Error ? error.message : "Unknown FCM dispatch error"
      };
    }
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      sanitized[key] = typeof val === "object" ? JSON.stringify(val) : String(val);
    }
    return sanitized;
  }
}
