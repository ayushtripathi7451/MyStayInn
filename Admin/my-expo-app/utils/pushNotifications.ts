import {
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
} from "react-native";
import messaging, {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  requestPermission,
} from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userApi } from "./api";

async function requestAndroidPostNotificationsIfNeeded(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const api = typeof Platform.Version === "number" ? Platform.Version : 0;
  if (api < 33) return true;
  const perm =
    (PermissionsAndroid.PERMISSIONS as { POST_NOTIFICATIONS?: string })
      .POST_NOTIFICATIONS ?? "android.permission.POST_NOTIFICATIONS";
  try {
    const r = await PermissionsAndroid.request(
      perm as "android.permission.POST_NOTIFICATIONS"
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

function isMessagingPermissionGranted(status: number): boolean {
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

let notificationSettingsPromptShown = false;

function maybePromptOpenNotificationSettings(body: string): void {
  if (notificationSettingsPromptShown) return;
  notificationSettingsPromptShown = true;
  Alert.alert("Turn on notifications", body, [
    { text: "Not now", style: "cancel" },
    { text: "Open settings", onPress: () => void Linking.openSettings() },
  ]);
}

// Must be at top-level (global scope), not inside a component.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log(
    "[AdminPush] Background message:",
    remoteMessage?.notification?.title ?? remoteMessage?.data?.title
  );
});

type PushPayload = {
  userId?: string;
  uniqueId?: string;
  fcmToken: string;
  app: string;
  platform: string;
};

export async function registerPushNotifications(): Promise<void> {
  try {
    const androidPostOk = await requestAndroidPostNotificationsIfNeeded();

    const messagingInstance = getMessaging();
    let authStatus = await hasPermission(messagingInstance);

    if (!isMessagingPermissionGranted(authStatus)) {
      authStatus = await requestPermission(messagingInstance);
    }

    const messagingOk = isMessagingPermissionGranted(authStatus);
    const enabled = messagingOk && androidPostOk;

    if (!enabled) {
      maybePromptOpenNotificationSettings(
        "To get tenant updates, payments, and property alerts, allow notifications. You can turn them on in Settings."
      );
      return;
    }

    const token = await getToken(messagingInstance);
    if (!token) {
      return;
    }

    await AsyncStorage.setItem("PUSH_FCM_TOKEN", token);

    const userDataStr = await AsyncStorage.getItem("userData");
    let payload: PushPayload | null = null;

    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        if (user?.uniqueId) {
          payload = {
            uniqueId: String(user.uniqueId),
            fcmToken: token,
            app: "admin",
            platform: Platform.OS,
          };
        } else if (user?.id != null && String(user.id).trim()) {
          payload = {
            userId: String(user.id),
            fcmToken: token,
            app: "admin",
            platform: Platform.OS,
          };
        }
      } catch {
        payload = null;
      }
    }

    if (!payload) {
      const jwtToken = await AsyncStorage.getItem("USER_TOKEN");
      if (!jwtToken) {
        return;
      }
      try {
        const decoded = JSON.parse(atob(jwtToken.split(".")[1] || ""));
        if (decoded?.uniqueId) {
          payload = {
            uniqueId: String(decoded.uniqueId),
            fcmToken: token,
            app: "admin",
            platform: Platform.OS,
          };
        } else if (decoded?.userId != null && String(decoded.userId).trim()) {
          payload = {
            userId: String(decoded.userId),
            fcmToken: token,
            app: "admin",
            platform: Platform.OS,
          };
        }
      } catch (decodeErr) {
        console.warn("[AdminPush] Failed to decode JWT for push registration", decodeErr);
        return;
      }
    }

    if (!payload || (!payload.userId && !payload.uniqueId)) {
      return;
    }

    await userApi.post("/api/users/push-token", payload);
    console.log("[AdminPush] Push token registered");
  } catch (err: any) {
    console.warn(
      "[AdminPush] Registration failed:",
      err?.response?.data?.message || err?.message || err
    );
  }
}

export function setupForegroundNotificationHandler(): void {
  try {
    const messagingInstance = getMessaging();
    onMessage(messagingInstance, (remoteMessage) => {
      const title = String(
        remoteMessage?.notification?.title ?? remoteMessage?.data?.title ?? "Notification"
      );
      const body = String(
        remoteMessage?.notification?.body ?? remoteMessage?.data?.body ?? ""
      );
      console.log("[AdminPush][foreground]", title, body);
    });
  } catch (err) {
    console.warn("[AdminPush] Foreground handler setup failed:", err);
  }
}
