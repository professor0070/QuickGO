import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CloudinaryFileStorageService, LocalFileStorageService, FILE_STORAGE } from "./file-storage.service";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";

import { InternalEventsModule } from "../internal-events/internal-events.module";

@Module({
  imports: [ConfigModule, InternalEventsModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cloudName = config.get<string>("CLOUDINARY_CLOUD_NAME");
        const apiKey = config.get<string>("CLOUDINARY_API_KEY");
        const apiSecret = config.get<string>("CLOUDINARY_API_SECRET");
        if (cloudName && apiKey && apiSecret) {
          return new CloudinaryFileStorageService(config);
        }
        return new LocalFileStorageService();
      }
    }
  ],
  exports: [UploadsService, FILE_STORAGE]
})
export class UploadsModule {}
