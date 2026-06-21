import { ConflictException, Injectable } from "@nestjs/common";
import { API_ERROR_CODES } from "../constants";

type StoredResponse = {
  status: "IN_PROGRESS" | "COMPLETED";
  body?: unknown;
};

@Injectable()
export class IdempotencyService {
  private readonly memoryStore = new Map<string, StoredResponse>();

  begin(key: string) {
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

  complete(key: string, body: unknown) {
    this.memoryStore.set(key, { status: "COMPLETED", body });
  }
}

