# Push notifications (FCM) – Customer app

## 1. Packages (already installed)

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

This app already has them in `package.json`.

## 2. Android / iOS config (Expo)

- **android**: `app.json` → `expo.android.googleServicesFile` = `"./google-services.json"`
- **ios**: `expo.ios.googleServicesFile` = `"./GoogleService-Info.plist"`
- **plugins**: `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/messaging`

Place `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) in the project root. After changing native config, run `npx expo prebuild` if you use a dev build.

## 3. Firebase Console

- Project Settings → Cloud Messaging → ensure **Cloud Messaging API** is enabled.

## 4. Request permission

Done in `utils/pushNotifications.ts`: `requestPermission(messaging)` before getting the token.

## 5. Get FCM token and save to backend

Done in `registerPushNotifications(userIdOrUniqueId)`:

```ts
const token = await getToken(messaging);
// In dev you’ll see: console.log('FCM Token:', token);

await userApi.post('/api/users/push-token', {
  userId: '...',   // or uniqueId
  fcmToken: token,
  app: 'customer',
  platform: Platform.OS,
});
```

Backend stores this in **user_devices** (user-service). If this request fails (e.g. 404), no token is saved → “no tenant has push notification enabled” when Admin sends.

## 6. When we register the token

- After PIN login (`PinLoginCard`)
- After Firebase/relogin (`ReloginMobileScreen`)
- When user lands on Home (`App.tsx` HomeScreen `useEffect`)

Set `EXPO_PUBLIC_API_HOST` in `.env` so the device can reach user-service (e.g. `10.0.2.2` for Android emulator).

## 7. Foreground notifications

`setupForegroundNotificationHandler()` in `App.tsx` uses `onMessage` and shows an `Alert` with title/body.

## 8. Background notifications

`setBackgroundMessageHandler` is registered at top level in `utils/pushNotifications.ts` (runs when the module loads). When the app is in background or quit, FCM shows the system notification; this handler runs for optional logging or data handling.

## 9. Backend sending (Node.js)

notification-service uses Firebase Admin SDK:

```ts
admin.messaging().send({ token: fcmToken, notification: { title, body } });
```

Tokens are resolved via user-service: `POST /api/users/internal/by-ids` with `userIds` → returns users with `fcmTokens` from `user_devices`.

## Important

**Enabling notifications in device settings ≠ token in DB.**  
The app must call `POST /api/users/push-token` successfully. If that fails (wrong URL, no auth, etc.), `user_devices` stays empty and the backend cannot send to that tenant.
