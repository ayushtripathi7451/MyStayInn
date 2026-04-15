import { InteractionManager } from "react-native";
import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
} from "@react-navigation/native";

/**
 * Root ref so logout (and similar) can reset the stack even when the current screen's
 * `navigation` prop is stale or no longer mounted — avoids "Couldn't find a navigation context".
 */
export const navigationRef = createNavigationContainerRef();

const welcomeResetState = {
  index: 0,
  routes: [{ name: "Welcome" as const }],
};

function dispatchWelcomeReset(): boolean {
  try {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(CommonActions.reset(welcomeResetState));
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[navigationRef] reset dispatch failed:", e);
    return false;
  }
}

/**
 * Reset stack to Welcome. Retries when the container is not ready yet.
 * Call from `setTimeout(..., 0)` after Alert/logout if you still see context errors.
 */
export function resetToWelcome(): void {
  if (dispatchWelcomeReset()) return;

  const retry = (attempt: number) => {
    if (dispatchWelcomeReset()) return;
    if (attempt >= 12) {
      if (__DEV__) console.warn("[navigationRef] resetToWelcome: max retries");
      return;
    }
    const delay = attempt < 4 ? 16 : attempt < 8 ? 50 : 120;
    setTimeout(() => retry(attempt + 1), delay);
  };

  requestAnimationFrame(() => {
    if (dispatchWelcomeReset()) return;
    InteractionManager.runAfterInteractions(() => {
      if (dispatchWelcomeReset()) return;
      retry(0);
    });
  });
}

/**
 * Clear session (token, Redux) then navigate to Welcome on the next tick.
 * Deferring navigation avoids "Couldn't find a navigation context" when logout runs inside Alert.
 */
export async function logoutAndResetToWelcome(): Promise<void> {
  const { logoutClearClientSession } = await import("./sessionStorage");
  await logoutClearClientSession();
  setTimeout(() => {
    resetToWelcome();
  }, 0);
}

const paymentCompleteResetState = {
  index: 0,
  routes: [{ name: "PaymentComplete" as const }],
};

const homeOnlyResetState = {
  index: 0,
  routes: [{ name: "Home" as const }],
};

function dispatchResetToPaymentComplete(): boolean {
  try {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(CommonActions.reset(paymentCompleteResetState));
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[navigationRef] reset PaymentComplete failed:", e);
    return false;
  }
}

function dispatchResetToHome(): boolean {
  try {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(CommonActions.reset(homeOnlyResetState));
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[navigationRef] reset Home failed:", e);
    return false;
  }
}

function runWithRetries(dispatch: () => boolean, label: string): void {
  if (dispatch()) return;
  const retry = (attempt: number) => {
    if (dispatch()) return;
    if (attempt >= 12) {
      if (__DEV__) console.warn(`[navigationRef] ${label}: max retries`);
      return;
    }
    const delay = attempt < 4 ? 16 : attempt < 8 ? 50 : 120;
    setTimeout(() => retry(attempt + 1), delay);
  };
  requestAnimationFrame(() => {
    if (dispatch()) return;
    InteractionManager.runAfterInteractions(() => {
      if (dispatch()) return;
      retry(0);
    });
  });
}

/**
 * After Cashfree / in-app browser returns, the checkout screen's `navigation` prop can be
 * stale — use the container ref so we never hit "Couldn't find a navigation context".
 */
export function resetStackToPaymentComplete(): void {
  runWithRetries(dispatchResetToPaymentComplete, "resetStackToPaymentComplete");
}

/** Post-success screen: single-route stack to Home (same as old navigation.reset). */
export function resetStackToHome(): void {
  runWithRetries(dispatchResetToHome, "resetStackToHome");
}

function dispatchSplashReplace(
  name: "LoginPin" | "Welcome"
): boolean {
  try {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(StackActions.replace(name));
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[navigationRef] Splash replace failed:", e);
    return false;
  }
}

/**
 * Initial splash → auth stack. Ref-based so first paint never depends on a flaky hook context.
 */
export function replaceSplashWithDestination(destination: "LoginPin" | "Welcome"): void {
  runWithRetries(() => dispatchSplashReplace(destination), "replaceSplashWithDestination");
}
