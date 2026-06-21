import { Module } from "@nestjs/common";
import { AuditEventHandler } from "./audit-event.handler";

@Module({
  providers: [AuditEventHandler]
})
export class AuditModule {}

