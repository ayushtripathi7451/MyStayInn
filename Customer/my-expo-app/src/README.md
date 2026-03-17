# MyStay Customer App – Data & API Architecture

This folder implements a **Stale-While-Revalidate (SWR)** style architecture for fast UI and minimal repeated API calls.

## Structure

```
src/
├── api/              # Central API layer (axios instances + typed methods)
│   ├── axiosInstance.ts   # Shared config, token injection
│   ├── client.ts          # Per-service axios clients
│   ├── authApi.ts, userApi.ts, ticketApi.ts, ...
│   └── index.ts
├── store/
│   ├── redux/        # Redux Toolkit slices (user, currentStay, tickets, moveOut)
│   ├── sagas/        # Background refresh (SWR)
│   ├── actions.ts    # refreshUser(), refreshCurrentStay(), ...
│   └── index.ts
└── hooks/            # useUser(), useCurrentStay(), useTickets(), useMoveOut()
```

## Data flow (SWR)

1. **Screen mounts** → hook runs → `dispatch(refreshUser())` (or refreshCurrentStay, etc.).
2. **Redux** already has cached data from a previous visit → **UI renders immediately** with that data.
3. **Saga** runs in the background → calls API → `put(setUser(data))` → UI updates only if data changed.
4. **No cache** → saga sets loading; first load shows spinner until data arrives.

So: **show cached data instantly → background refresh → update UI if changed.**

## Usage in components

- Prefer **hooks** so screens stay simple and consistent:

```tsx
import { useUser } from '../src/hooks';

const { name, uniqueId, loading, refresh } = useUser();
// Show name/uniqueId; only show loading when !data && loading
```

- For **manual refresh** (e.g. pull-to-refresh or after an action): call `refresh()` from the hook.
- **Do not** call API directly in components for this data; use dispatch + selectors/hooks so the cache stays single source of truth.

## Backend

- **Sagas use `utils/api.ts`** (same axios instances as the rest of the app) so token, base URL, and interceptors are consistent. The `src/api/` layer remains available for typed wrappers or future use.
- API host is set in `utils/api.ts` (e.g. `API_HOST = "192.168.1.7"` or from `EXPO_PUBLIC_API_HOST`).

## Adding a new cached entity

1. Add slice in `store/redux/slices/`.
2. Add saga in `store/sagas/` (REFRESH_* action + generator).
3. Register in `store/redux/index.ts` and `store/sagas/index.ts`.
4. Add `refresh*` in `store/actions.ts` and a hook in `hooks/`.
5. Use the hook in screens; keep API calls in the saga only.
