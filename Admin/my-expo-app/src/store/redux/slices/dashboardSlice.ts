import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DashboardState {
  emptyBeds: number | null;
  occupancyRate: number | null;
  enrollmentCount: number | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: DashboardState = {
  emptyBeds: null,
  occupancyRate: null,
  enrollmentCount: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardStats: (
      state,
      action: PayloadAction<{
        emptyBeds?: number | null;
        occupancyRate?: number | null;
        enrollmentCount?: number | null;
      }>
    ) => {
      if (action.payload.emptyBeds !== undefined) state.emptyBeds = action.payload.emptyBeds;
      if (action.payload.occupancyRate !== undefined) state.occupancyRate = action.payload.occupancyRate;
      if (action.payload.enrollmentCount !== undefined) state.enrollmentCount = action.payload.enrollmentCount;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setDashboardError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearDashboard: () => initialState,
  },
});

export const { setDashboardStats, setDashboardLoading, setDashboardError, clearDashboard } =
  dashboardSlice.actions;
export default dashboardSlice.reducer;
