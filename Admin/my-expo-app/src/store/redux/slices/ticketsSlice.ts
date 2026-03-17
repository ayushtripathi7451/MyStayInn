import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TicketCountsState {
  open: number;
  closed: number;
}

export interface TicketsState {
  counts: TicketCountsState | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: TicketsState = {
  counts: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    setTicketCounts: (state, action: PayloadAction<TicketCountsState>) => {
      state.counts = action.payload;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    setTicketsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTicketsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearTickets: () => initialState,
  },
});

export const { setTicketCounts, setTicketsLoading, setTicketsError, clearTickets } = ticketsSlice.actions;
export default ticketsSlice.reducer;
