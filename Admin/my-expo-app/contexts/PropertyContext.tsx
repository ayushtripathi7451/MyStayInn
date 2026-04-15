import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { propertyApi } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Property {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  totalRooms?: number;
  status?: string;
  propertyType?: string;
  uniqueId?: string;
}

interface PropertyContextType {
  properties: Property[];
  currentProperty: Property | null;
  setCurrentProperty: (property: Property) => Promise<void>;
  loading: boolean;
  /** Re-fetch properties. Pass `selectPropertyId` (e.g. after creating a property) to select that listing. */
  refresh: (options?: { selectPropertyId?: string }) => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

const CURRENT_PROPERTY_KEY = 'currentProperty';

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentProperty, setCurrentPropertyState] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProperties = async (options?: { selectPropertyId?: string }) => {
    try {
      setLoading(true);
      const res = await propertyApi.get('/api/properties/list');
      if (res.data?.success && Array.isArray(res.data.properties)) {
        const fetched: Property[] = res.data.properties.map((p: any) => ({
          id: p.uniqueId || String(p.id),
          name: p.name,
          address: [p.address, p.city, p.state].filter(Boolean).join(', '),
          city: p.city,
          state: p.state,
          totalRooms: p.totalRooms,
          status: p.status,
          propertyType: p.propertyType,
          uniqueId: p.uniqueId,
        }));
        setProperties(fetched);

        let next: Property | null = null;
        const selectId = options?.selectPropertyId?.trim();
        if (selectId && fetched.length > 0) {
          next =
            fetched.find(
              (p) => p.id === selectId || p.uniqueId === selectId || String(p.uniqueId) === selectId
            ) || fetched[0] || null;
        } else {
          const saved = await AsyncStorage.getItem(CURRENT_PROPERTY_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const match = fetched.find((p) => p.id === parsed.id);
              next = match || fetched[0] || null;
            } catch {
              next = fetched[0] || null;
            }
          } else {
            next = fetched[0] || null;
          }
        }
        setCurrentPropertyState(next);
        if (next) {
          try {
            await AsyncStorage.setItem(CURRENT_PROPERTY_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      console.warn('[PropertyContext] Failed to fetch properties:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const setCurrentProperty = async (property: Property) => {
    setCurrentPropertyState(property);
    try {
      await AsyncStorage.setItem(CURRENT_PROPERTY_KEY, JSON.stringify(property));
    } catch {}
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        currentProperty,
        setCurrentProperty,
        loading,
        refresh: fetchProperties,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
}
