import { Module } from "@nestjs/common";
import { AppVersionsController } from "./app-versions.controller";

@Module({
  controllers: [AppVersionsController]
})
export class AppVersionsModule {}

