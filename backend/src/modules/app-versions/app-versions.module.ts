import { Module } from "@nestjs/common";
import { AppVersionsController, RootApiController } from "./app-versions.controller";

@Module({
  controllers: [RootApiController, AppVersionsController]
})
export class AppVersionsModule {}
