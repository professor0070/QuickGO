import { Global, Module } from "@nestjs/common";
import { DomainEventBus } from "./domain-event-bus.service";
import { DomainEventLogger } from "./domain-event-logger";

@Global()
@Module({
  providers: [DomainEventBus, DomainEventLogger],
  exports: [DomainEventBus]
})
export class InternalEventsModule {}

