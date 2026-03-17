# MyStay Admin App – Data & API Architecture

Same **Stale-While-Revalidate (SWR)** pattern as the Customer app: cached data shown first, background refresh, minimal repeated API calls.

## Structure

```
src/
├── store/
│   ├── redux/          # Slices: properties, tickets, dashboard
│   ├── sagas/          # refreshProperties, refreshTicketCounts, refreshDashboardStats (use utils/api)
│   ├── actions.ts      # refreshProperties(), refreshTicketCounts(), refreshDashboardStats()
│   └── index.ts
└── hooks/              # useProperties(), useTickets(), useDashboardStats()
```

## Data flow (SWR)

1. Screen mounts → hook runs → dispatches REFRESH_*.
2. Redux already has cached data → UI renders immediately.
3. Saga runs in background (using `utils/api`) → updates store → UI updates if data changed.
4. No cache → saga sets loading; first load shows spinner until data arrives.

## Usage

- **HomeScreen**: uses `useProperties()`, `useTickets()`, `useDashboardStats()`; syncs first property to PropertyContext + AsyncStorage.
- **PropertyDropdown**: uses `useProperties()` for list; calls `refresh()` when dropdown opens.
- **Sagas** use `utils/api` (propertyApi, ticketApi, bookingApi) so token and base URL match the rest of the app.

## Adding a new cached entity

1. Add slice in `store/redux/slices/`.
2. Add saga in `store/sagas/` (REFRESH_* action, call utils/api).
3. Register in `store/redux/index.ts` and `store/sagas/index.ts`.
4. Add action in `store/actions.ts` and hook in `hooks/`.
