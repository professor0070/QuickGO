import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { API_ERROR_CODES } from "../constants";
import { PrismaService } from "../../modules/common/prisma.service";

type StoredResponse = {
  status: "IN_PROGRESS" | "COMPLETED";
  body?: unknown;
};

type IdempotencyDelegate = {
  findUnique(args: any): Promise<{ status: string; response?: unknown } | null>;
  create(args: any): Promise<unknown>;
  update(args: any): Promise<unknown>;
  deleteMany(args: any): Promise<unknown>;
};

@Injectable()
export class IdempotencyService {
  private readonly memoryStore = new Map<string, StoredResponse>();

  constructor(private readonly prisma: PrismaService) {}

  async begin(key: string) {
    const delegate = this.idempotencyDelegate();
    if (delegate) {
      return this.beginPersistent(delegate, key);
    }

    const existing = this.memoryStore.get(key);
    if (existing?.status === "IN_PROGRESS") {
      throw new ConflictException({
        code: API_ERROR_CODES.DUPLICATE_REQUEST,
        message: "Duplicate request is already in progress"
      });
    }
    if (existing?.status === "COMPLETED") {
      return existing.body;
    }
    this.memoryStore.set(key, { status: "IN_PROGRESS" });
    return undefined;
  }

  async complete(key: string, body: unknown) {
    const delegate = this.idempotencyDelegate();
    if (delegate) {
      await delegate.update({
        where: { key },
        data: {
          status: "COMPLETED",
          response: this.toJson(body)
        }
      });
      return;
    }

    this.memoryStore.set(key, { status: "COMPLETED", body });
  }

  async fail(key: string) {
    const delegate = this.idempotencyDelegate();
    if (delegate) {
      await delegate.deleteMany({
        where: { key, status: "IN_PROGRESS" }
      });
      return;
    }

    const existing = this.memoryStore.get(key);
    if (existing?.status === "IN_PROGRESS") {
      this.memoryStore.delete(key);
    }
  }

  private async beginPersistent(delegate: IdempotencyDelegate, key: string) {
    const existing = await delegate.findUnique({ where: { key } });
    if (existing?.status === "IN_PROGRESS") {
      throw new ConflictException({
        code: API_ERROR_CODES.DUPLICATE_REQUEST,
        message: "Duplicate request is already in progress"
      });
    }
    if (existing?.status === "COMPLETED") {
      return existing.response;
    }

    try {
      await delegate.create({
        data: {
          key,
          scope: key.split(":")[0] ?? "UNKNOWN",
          status: "IN_PROGRESS",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    } catch {
      const raced = await delegate.findUnique({ where: { key } });
      if (raced?.status === "COMPLETED") {
        return raced.response;
      }
      throw new ConflictException({
        code: API_ERROR_CODES.DUPLICATE_REQUEST,
        message: "Duplicate request is already in progress"
      });
    }

    return undefined;
  }

  private idempotencyDelegate() {
    return (this.prisma as unknown as { idempotencyKey?: IdempotencyDelegate }).idempotencyKey;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
