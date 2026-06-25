import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { NotificationsService } from "./notifications.service";

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;
}

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.notifications.list(user.id);
  }

  @Get("unread-count")
  async unreadCount(@CurrentUser() user: RequestUser) {
    return { unread_count: await this.notifications.unreadCount(user.id) };
  }

  @Patch(":notificationId/read")
  markRead(@CurrentUser() user: RequestUser, @Param("notificationId") notificationId: string) {
    return this.notifications.markRead(user.id, notificationId);
  }

  @Post("register-device")
  registerDevice(
    @CurrentUser() user: RequestUser,
    @Body() body: RegisterDeviceDto
  ) {
    return this.notifications.registerDevice(user.id, body, user.roles);
  }
}
