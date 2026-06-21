import { Global, Module } from "@nestjs/common";
import { IdempotencyService } from "../../common/idempotency/idempotency.service";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, IdempotencyService],
  exports: [PrismaService, IdempotencyService]
})
export class CommonModule {}

