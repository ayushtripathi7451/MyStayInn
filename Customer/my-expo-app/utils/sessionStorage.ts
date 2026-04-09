import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "../src/store/redux";
import { clearCurrentStay } from "../src/store/redux/slices/currentStaySlice";
import { clearUser } from "../src/store/redux/slices/userSlice";
import { bumpCurrentStayAccountEpoch } from "../src/store/sagas/currentStaySaga";
import { CUSTOMER_PUSH_INBOX_KEY } from "./customerInbox";

/**
 * Keys that must be wiped when switching accounts so the previous user's
 * JWT, profile, inbox, and Redux caches cannot leak into the next session.
 */
const USER_SCOPED_ASYNC_KEYS = [
  "USER_TOKEN",
  "authToken",
  "userData",
  "userProfile",
  CUSTOMER_PUSH_INBOX_KEY,
] as const;

function dispatchClearReduxSession(): void {
  bumpCurrentStayAccountEpoch();
  store.dispatch(clearCurrentStay());
  store.dispatch(clearUser());
}

/**
 * Call **before** writing a new USER_TOKEN (login / register success).
 * Prevents stale dues, profile, and inbox from the previous account.
 */
export async function resetClientStateBeforeNewSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...USER_SCOPED_ASYNC_KEYS]);
  } catch (e) {
    if (__DEV__) console.warn("[session] resetClientStateBeforeNewSession multiRemove:", e);
  }
  dispatchClearReduxSession();
}

/**
 * Full sign-out: remove session keys and clear Redux (same as pre-login reset).
 */
export async function logoutClearClientSession(): Promise<void> {
  await resetClientStateBeforeNewSession();
}
