import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import userReducer from './slices/userSlice';
import currentStayReducer from './slices/currentStaySlice';
import ticketsReducer from './slices/ticketsSlice';
import moveOutReducer from './slices/moveOutSlice';
import { rootSaga } from '../sagas';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    user: userReducer,
    currentStay: currentStayReducer,
    tickets: ticketsReducer,
    moveOut: moveOutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
