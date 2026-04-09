/**
 * Central Axios configuration for MyStay Customer app.
 * Single place for: base config, token injection, retry, and error handling.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TIMEOUT = 10000;

export const getBaseURL = (port: number) => `http://192.168.1.7:${port}`;

/** Attach JWT from AsyncStorage to request */
export async function attachAuth(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  try {
    const token = await AsyncStorage.getItem('USER_TOKEN');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('attachAuth:', e);
  }
  return config;
}

/** Create an axios instance for a given service port */
export function createApiClient(port: number, options?: { timeout?: number }) {
  const client = axios.create({
    baseURL: getBaseURL(port),
    timeout: options?.timeout ?? DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(
    async (config) => attachAuth(config),
    (err) => Promise.reject(err)
  );

  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      if (err.response?.status === 401) {
        // Optional: dispatch logout or refresh token
      }
      return Promise.reject(err);
    }
  );

  return client;
}

// Service ports (align with backend)
export const PORTS = {
  AUTH: 3001,
  USER: 3002,
  TRANSACTION: 3003,
  PROPERTY: 3004,
  TICKET: 3007,
  BOOKING: 3008,
  MOVE_OUT: 3010,
} as const;
