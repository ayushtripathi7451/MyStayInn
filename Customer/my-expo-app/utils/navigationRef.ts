import { CommonActions, createNavigationContainerRef } from "@react-navigation/native";

/**
 * Root ref so logout (and similar) can reset the stack even when the current screen's
 * `navigation` prop is stale or no longer mounted — avoids "Couldn't find a navigation context".
 */
export const navigationRef = createNavigationContainerRef();

const welcomeResetState = {
  index: 0,
  routes: [{ name: "Welcome" as const }],
};

export function resetToWelcome(): void {
  const apply = (): boolean => {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(CommonActions.reset(welcomeResetState));
    return true;
  };
  if (apply()) return;
  requestAnimationFrame(() => {
    if (apply()) return;
    setTimeout(apply, 50);
  });
}
