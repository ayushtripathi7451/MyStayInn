import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import propertiesReducer from './slices/propertiesSlice';
import ticketsReducer from './slices/ticketsSlice';
import dashboardReducer from './slices/dashboardSlice';
import currentStayReducer from './slices/currentStaySlice';
import { rootSaga } from '../sagas';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    properties: propertiesReducer,
    tickets: ticketsReducer,
    dashboard: dashboardReducer,
    currentStay: currentStayReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
