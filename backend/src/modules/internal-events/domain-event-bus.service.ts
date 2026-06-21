import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { filter, Subject } from "rxjs";
import {
  DomainEvent,
  DomainEventHandler,
  DomainEventMap,
  DomainEventMetadata,
  DomainEventName
} from "./domain-event.types";

export type EventHandlerRegistration = {
  unsubscribe(): void;
};

@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly events$ = new Subject<DomainEvent>();

  async publish<TName extends DomainEventName>(
    name: TName,
    payload: DomainEventMap[TName],
    metadata: DomainEventMetadata
  ): Promise<DomainEvent<TName>> {
    const event: DomainEvent<TName> = {
      id: randomUUID(),
      name,
      payload,
      occurredAt: new Date().toISOString(),
      metadata
    };

    this.events$.next(event);
    return event;
  }

  on<TName extends DomainEventName>(
    name: TName,
    handler: DomainEventHandler<TName>
  ): EventHandlerRegistration {
    return this.events$
      .pipe(filter((event): event is DomainEvent<TName> => event.name === name))
      .subscribe({
        next: (event) => {
          Promise.resolve(handler(event)).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "Unknown event handler error";
            this.logger.error(`Internal event handler failed for ${event.name}: ${message}`);
          });
        }
      });
  }
}
