import { Module } from "@nestjs/common";
import { ReconciliationEventHandler } from "./reconciliation-event.handler";

@Module({
  providers: [ReconciliationEventHandler]
})
export class ReconciliationModule {}

