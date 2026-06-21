import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FcmProvider } from "./fcm.provider";
import { NotificationEventHandler } from "./notification-event.handler";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [FcmProvider, NotificationEventHandler, NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
