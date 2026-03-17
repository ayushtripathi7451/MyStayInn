import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MoveOutState {
  data: any | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: MoveOutState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const moveOutSlice = createSlice({
  name: 'moveOut',
  initialState,
  reducers: {
    setMoveOut: (state, action: PayloadAction<any | null>) => {
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    setMoveOutLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setMoveOutError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearMoveOut: () => initialState,
  },
});

export const { setMoveOut, setMoveOutLoading, setMoveOutError, clearMoveOut } = moveOutSlice.actions;
export default moveOutSlice.reducer;
