import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  data: { firstName?: string; lastName?: string; uniqueId?: string; id?: string; [key: string]: any } | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: UserState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState['data']>) => {
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    setUserLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUserError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearUser: () => initialState,
  },
});

export const { setUser, setUserLoading, setUserError, clearUser } = userSlice.actions;
export default userSlice.reducer;
