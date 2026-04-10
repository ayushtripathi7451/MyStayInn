import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {
  getMessaging,
  getToken,
  requestPermission,
  AuthorizationStatus,
  onMessage,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './api';
import { appendCustomerPushInbox, hasDisplayablePushContent } from './customerInbox';

function extractPushText(remoteMessage: any): { title: string; body: string } {
  const n = remoteMessage?.notification;
  const d = (remoteMessage?.data || {}) as Record<string, unknown>;
  const title = String(n?.title ?? d.title ?? d.notification_title ?? '').trim();
  const body = String(
    n?.body ?? d.body ?? d.message ?? d.notification_body ?? d.content ?? ''
  ).trim();
  return { title, body };
}

/**
 * Property-owner enrollment alerts — must not show in the customer app (one user may
 * register both admin + customer FCM tokens on the same account).
 */
function isOwnerOnlyEnrollmentNotification(remoteMessage: any): boolean {
  const d = (remoteMessage?.data || {}) as Record<string, unknown>;
  const kind = String(d.notificationKind ?? d.audience ?? '').toLowerCase();
  if (kind === 'owner_new_enrollment') return true;
  if (kind === 'admin' || kind === 'owner') return true;
  const { title } = extractPushText(remoteMessage);
  const t = title.toLowerCase();
  if (t.includes('new booking request received')) return true;
  return false;
}

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (isOwnerOnlyEnrollmentNotification(remoteMessage)) {
    return;
  }
  const { title, body } = extractPushText(remoteMessage);
  if (!hasDisplayablePushContent(title, body)) {
    return;
  }
  console.log('[PushNotifications] Background message:', title || '(body only)');
  await appendCustomerPushInbox(title, body);
});

/**
 * Register device for push: request permission, get FCM token, send to backend.
 * Uses userId from JWT token for reliability instead of userData from AsyncStorage.
 */
export async function registerPushNotifications(): Promise<void> {
  try {
    console.log('[PushNotifications] Starting registration...');
    
    const messagingInstance = getMessaging();
    console.log('[PushNotifications] Requesting permission...');
    
    const authStatus = await requestPermission(messagingInstance);
    console.log('[PushNotifications] Permission status:', authStatus);
    
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[PushNotifications] Permission not granted, skipping registration');
      return;
    }

    console.log('[PushNotifications] Getting FCM token...');
    const token = await getToken(messagingInstance);
    console.log('[PushNotifications] FCM token obtained:', token ? 'YES' : 'NO', token?.substring(0, 20) + '...');
    
    if (!token) {
      console.warn('[PushNotifications] No FCM token received');
      return;
    }
    
    await AsyncStorage.setItem('PUSH_FCM_TOKEN', token);
    console.log('[PushNotifications] Token saved to AsyncStorage');

    // Prefer uniqueId: user-service DB is synced by uniqueId from auth. Numeric userId in JWT is auth DB id and may not exist in user-service.
    const userDataStr = await AsyncStorage.getItem('userData');
    let payload: { userId?: string; uniqueId?: string; fcmToken: string; app: string; platform: string };
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        if (user?.uniqueId) {
          payload = { uniqueId: user.uniqueId, fcmToken: token, app: 'customer', platform: Platform.OS };
          console.log('[PushNotifications] Using uniqueId from userData:', user.uniqueId);
        } else if (user?.id != null && String(user.id).trim()) {
          payload = { userId: String(user.id), fcmToken: token, app: 'customer', platform: Platform.OS };
          console.log('[PushNotifications] Using userId from userData:', user.id);
        } else {
          payload = { fcmToken: token, app: 'customer', platform: Platform.OS };
        }
      } catch (_) {
        payload = { fcmToken: token, app: 'customer', platform: Platform.OS };
      }
    } else {
      const jwtToken = await AsyncStorage.getItem('USER_TOKEN');
      if (!jwtToken) {
        console.warn('[PushNotifications] No userData or JWT, cannot register push');
        return;
      }
      try {
        const decoded = JSON.parse(atob(jwtToken.split('.')[1]));
        if (decoded.uniqueId) {
          payload = { uniqueId: decoded.uniqueId, fcmToken: token, app: 'customer', platform: Platform.OS };
        } else if (decoded.userId) {
          payload = { userId: String(decoded.userId), fcmToken: token, app: 'customer', platform: Platform.OS };
        } else {
          console.warn('[PushNotifications] No userId/uniqueId in JWT');
          return;
        }
      } catch (e) {
        console.warn('[PushNotifications] Failed to decode JWT', e);
        return;
      }
    }

    if (!payload.uniqueId && !payload.userId) {
      console.warn('[PushNotifications] No uniqueId or userId to send');
      return;
    }

    console.log('[PushNotifications] Sending token to backend:', { ...payload, fcmToken: payload.fcmToken?.substring(0, 20) + '...' });

    const response = await userApi.post('/api/users/push-token', payload);
    console.log('[PushNotifications] Backend response:', response.data);
    
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err?.message;
    const url = err?.config?.url ? `${err.config.baseURL || ''}${err.config.url}` : 'unknown';
    
    console.error('[PushNotifications] Registration failed:', {
      status,
      message,
      url,
      fullError: err
    });
    
    // Don't rethrow - we don't want to break the login flow
  }
}

/**
 * Call once at app start (e.g. in App.tsx or after login) to show notifications when app is in foreground.
 * When app is in background/quit, the system tray notification is shown by FCM.
 */
export function setupForegroundNotificationHandler(): void {
  try {
    const messagingInstance = getMessaging();
    onMessage(messagingInstance, (remoteMessage) => {
      if (isOwnerOnlyEnrollmentNotification(remoteMessage)) {
        return;
      }
      const { title, body } = extractPushText(remoteMessage);
      if (!hasDisplayablePushContent(title, body)) {
        return;
      }
      // Foreground: store in inbox only — no modal alert (owner-only pushes are dropped above).
      void appendCustomerPushInbox(title, body);
    });
  } catch (err) {
    console.warn('[PushNotifications] foreground handler setup failed:', err);
  }
}
