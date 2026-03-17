// Notification service: real push via notification-service backend
import { bookingApi } from "../utils/api";
import { notifyApi } from "../utils/api";

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'high';
  recipients: string[];
  recipientType: 'all' | 'selected';
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
  readBy: string[];
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  status: 'Active' | 'Moved Out';
  email?: string;
}

let notificationHistory: NotificationData[] = [];

export class NotificationService {
  /**
   * Fetch active tenants from backend (bookings with customer + room).
   * Use for SendNotificationScreen tenant list; id = user-service userId for push.
   * On 401, throws so caller can show "Session expired" or redirect to login.
   */
  static async fetchActiveTenants(): Promise<Tenant[]> {
    const res = await bookingApi.get("/api/bookings/list/active-with-details", {
      timeout: 15000,
    });

    if (!res.data?.success || !Array.isArray(res.data.bookings)) {
      console.warn(
        "[NotificationService] fetchActiveTenants: unexpected response shape",
        res.data
      );
      return [];
    }

    try {
      return res.data.bookings.map((b: any) => {
        const customer = b.customer || {};
        const room = b.room || {};
        const name =
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Unknown";

        return {
          id: String(customer.id ?? b.customerId ?? ""),
          name,
          phone: customer.phone || "",
          roomNumber: room.roomNumber ? String(room.roomNumber) : "—",
          status: "Active" as const,
          email: customer.email,
        };
      });
    } catch (err) {
      console.error(
        "[NotificationService] fetchActiveTenants: error mapping bookings → tenants",
        err
      );
      return [];
    }
  }

  /**
   * Get active tenants (sync); returns empty until fetchActiveTenants() has been used.
   * Prefer using fetchActiveTenants() in UI and passing list as state.
   */
  static getActiveTenants(): Tenant[] {
    return [];
  }

  static getTenantById(_id: string, tenants: Tenant[]): Tenant | undefined {
    return tenants.find((t) => t.id === _id);
  }

  /**
   * Send push notification via notification-service (FCM to customer devices).
   * userIds = tenant ids from fetchActiveTenants() (user-service user ids).
   */
  static async sendNotification(
    title: string,
    message: string,
    recipientType: 'all' | 'selected',
    selectedTenants: string[] = [],
    _priority: 'normal' | 'high' = 'normal',
    activeTenants: Tenant[] = []
  ): Promise<{ success: boolean; notificationId?: string; error?: string; tokensSent?: number; successCount?: number; fcmErrorCode?: string }> {
    try {
      const userIds =
        recipientType === 'all'
          ? activeTenants.map((t) => t.id)
          : selectedTenants.filter((id) => activeTenants.some((t) => t.id === id));

      if (userIds.length === 0) {
        return { success: false, error: 'No valid recipients found' };
      }

      const resp = await notifyApi.post("/api/notify/send", {
        title,
        message,
        userIds,
        priority: _priority,
      });

      if (!resp.data.success) {
        return {
          success: false,
          error: resp.data.message || "Failed to send notification",
        };
      }

      const tokensSent = resp.data.tokensSent ?? 0;
      const successCount = resp.data.successCount ?? 0;

      notificationHistory.push({
        id: `notif_${Date.now()}`,
        title,
        message,
        priority: _priority,
        recipients: userIds,
        recipientType,
        sentAt: new Date(),
        status: 'sent',
        readBy: [],
      });

      return {
        success: true,
        notificationId: resp.data.id,
        tokensSent,
        successCount,
        fcmErrorCode: resp.data.fcmErrorCode,
      };
    } catch (e: any) {
      console.error("Failed to send notification:", e?.response?.data || e);
      return {
        success: false,
        error: e?.response?.data?.message || "Failed to send notification. Please try again.",
      };
    }
  }

  /**
   * Get notification history
   */
  static getNotificationHistory(): NotificationData[] {
    return notificationHistory.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  /**
   * Get notification by ID
   */
  static getNotificationById(id: string): NotificationData | undefined {
    return notificationHistory.find(notif => notif.id === id);
  }

  /**
   * Mark notification as read by tenant
   */
  static markAsRead(notificationId: string, tenantId: string): boolean {
    const notification = this.getNotificationById(notificationId);
    if (notification && !notification.readBy.includes(tenantId)) {
      notification.readBy.push(tenantId);
      return true;
    }
    return false;
  }

  /**
   * Get unread notifications count for tenant
   */
  static getUnreadCount(tenantId: string): number {
    return notificationHistory.filter(notif => 
      notif.recipients.includes(tenantId) && 
      !notif.readBy.includes(tenantId)
    ).length;
  }

  /**
   * Get notifications for specific tenant
   */
  static getNotificationsForTenant(tenantId: string): NotificationData[] {
    return notificationHistory
      .filter(notif => notif.recipients.includes(tenantId))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  /**
   * Delete notification (admin only)
   */
  static deleteNotification(notificationId: string): boolean {
    const index = notificationHistory.findIndex(notif => notif.id === notificationId);
    if (index !== -1) {
      notificationHistory.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get notification statistics
   */
  static getNotificationStats() {
    const total = notificationHistory.length;
    const sent = notificationHistory.filter(n => n.status === 'sent').length;
    const failed = notificationHistory.filter(n => n.status === 'failed').length;
    const highPriority = notificationHistory.filter(n => n.priority === 'high').length;
    
    return {
      total,
      sent,
      failed,
      pending: total - sent - failed,
      highPriority,
      normalPriority: total - highPriority
    };
  }
}

export default NotificationService;