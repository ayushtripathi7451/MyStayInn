import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CurrentStayProperty {
  id: string;
  name: string;
  status: string;
  isSecurityPaid?: boolean;
  roomNumber: string;
  monthlyRent: number;
  checkInDate: string;
  address?: string;
  bookingId?: string;
  roomId?: string;
  propertyId?: string;
  moveOutDate?: string;
  bgColor?: string;
  propertyType?: string;
  roomType?: string;
  floor?: number;
  latitude?: number | null;
  longitude?: number | null;
  /** Total amount due for this property (backend-computed) */
  currentDue?: number;
  /** Security deposit amount for this booking/property */
  securityDeposit?: number;
  /** Property rules & food menu (saved by admin), for Property Details screen */
  rules?: Record<string, unknown> | null;
}

/** Used by saga to decide whether to skip API (cache TTL = 5 min) */
export interface CurrentStayState {
  /** All active stays (multiple properties). */
  stays: CurrentStayProperty[];
  /** First stay; kept for screens that still expect a single property. */
  data: CurrentStayProperty | null;
  /** Raw API shape: `{ currentStays: [...] }` after multi-stay, or legacy single stay fields. */
  raw: any | null;
  loading: boolean;
  error: string | null;
  /** Timestamp (ms) of last successful fetch; null = never fetched or cleared */
  lastFetchedAt: number | null;
}

const initialState: CurrentStayState = {
  stays: [],
  data: null,
  raw: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const currentStaySlice = createSlice({
  name: 'currentStay',
  initialState,
  reducers: {
    setCurrentStay: (
      state,
      action: PayloadAction<{ stays?: CurrentStayProperty[]; data?: CurrentStayProperty | null; raw?: any }>
    ) => {
      const stays =
        action.payload.stays ??
        (action.payload.data != null ? [action.payload.data] : []);
      state.stays = stays;
      state.data = stays[0] ?? null;
      if (action.payload.raw !== undefined) state.raw = action.payload.raw;
      state.error = null;
      state.loading = false; // ensure card can render when data is set (avoids stuck loading)
      state.lastFetchedAt = Date.now();
    },
    setCurrentStayLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCurrentStayError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearCurrentStay: () => initialState,
  },
});

export const { setCurrentStay, setCurrentStayLoading, setCurrentStayError, clearCurrentStay } =
  currentStaySlice.actions;
export default currentStaySlice.reducer;
