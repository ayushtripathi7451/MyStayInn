import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PropertiesState {
  list: any[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: PropertiesState = {
  list: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    setProperties: (state, action: PayloadAction<any[]>) => {
      state.list = action.payload;
      state.error = null;
      state.lastFetchedAt = Date.now();
    },
    setPropertiesLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPropertiesError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearProperties: () => initialState,
  },
});

export const { setProperties, setPropertiesLoading, setPropertiesError, clearProperties } =
  propertiesSlice.actions;
export default propertiesSlice.reducer;
