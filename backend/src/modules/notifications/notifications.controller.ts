import { Controller, Get, Param, Patch } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { NotificationsService } from "./notifications.service";

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
}
