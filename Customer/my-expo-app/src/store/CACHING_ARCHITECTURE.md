# Caching Architecture for React Native + Redux-Saga

## Overview

`currentStay` (and similar entities) use a **time-based cache** so that:

1. Data is fetched **once on app startup** (when the first consumer mounts).
2. All screens **read from Redux only** — no direct API calls from UI.
3. The API is called again **only when**:
   - Data does not exist
   - Data is older than **5 minutes** (`CURRENT_STAY_CACHE_TTL_MS`)
   - User performs an action that updates the stay → call `refreshCurrentStay(true)` to force refresh

## Redux Slice Shape

```ts
currentStay: {
  data: CurrentStayProperty | null,   // Normalized for UI
  raw: any | null,                   // Raw API response (e.g. for DueAmount)
  loading: boolean,
  error: string | null,
  lastFetchedAt: number | null       // Timestamp (ms); used for TTL check
}
```

## Saga Logic (currentStay)

- On `REFRESH_CURRENT_STAY`:
  - If `payload?.force === true` → always fetch.
  - Else if `data` exists and `lastFetchedAt` is within 5 minutes → **skip API**, return.
  - Otherwise set loading (only if no data), call API, then `setCurrentStay({ data, raw })` and set `lastFetchedAt` in the reducer.

## Home Screen Usage

- **Read from Redux only:**  
  `const currentStay = useSelector(state => state.currentStay.data)`
- **Loading guard:**  
  When `loading && !data`, show `<ActivityIndicator />` to avoid blank UI on first load.
- **No per-navigation fetch:**  
  Child components (e.g. InfoCards, DueAmount) use `useCurrentStay()` which dispatches `refreshCurrentStay()`. The saga skips the API if cache is fresh.

## useFocusEffect (optional)

- Screens can call `refresh()` (from `useCurrentStay`) inside `useFocusEffect` so that when the user returns to the screen, a **background refresh** runs only if the cache is expired. No duplicate requests if data is fresh.

## When to Force Refresh

After any action that changes the stay on the server, dispatch:

```ts
dispatch(refreshCurrentStay(true));
```

Examples: after completing security deposit payment, after admin allocates a room (if the client is notified), after move-out request, etc.

## Best Practices for Mobile Data Fetching

1. **Single source of truth:** Keep API data in Redux; components only read and dispatch refresh actions.
2. **TTL-based cache:** Avoid refetching on every navigation; use a short TTL (e.g. 5 min) and optional force refresh after mutations.
3. **Loading states:** Show a loading UI only when there is no data yet; for background refresh, keep showing cached data.
4. **Persistence:** Redux state lives in memory; for offline/cold start, consider persisting the slice (e.g. redux-persist) and revalidate on app focus.
5. **Avoid duplicate requests:** Centralize fetch logic in sagas and gate by `lastFetchedAt` + TTL (and optional `force`).
