import { Request } from "express";
import { RequestUser } from "../auth/current-user.decorator";
import { DomainEventMetadata } from "../../modules/internal-events/domain-event.types";

export function eventMetadata(source: string, request?: Request): DomainEventMetadata {
  const requestWithUser = request as (Request & { user?: Partial<RequestUser> }) | undefined;
  return {
    source,
    actorId: requestWithUser?.user?.id,
    requestId: headerValue(request, "x-request-id"),
    idempotencyKey: headerValue(request, "idempotency-key")
  };
}

function headerValue(request: Request | undefined, name: string) {
  const value = request?.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
