import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Property {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  occupiedRooms: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingDues: number;
  bookingRequests: number;
  moveOutRequests: number;
  openTickets: number;
}

interface PropertyContextType {
  properties: Property[];
  currentProperty: Property;
  setCurrentProperty: (property: Property) => void;
  addProperty: (property: Property) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

// Static property data
const defaultProperties: Property[] = [
  {
    id: '1',
    name: 'Mahima Panorama',
    address: 'Sector 12, Noida',
    totalRooms: 120,
    occupiedRooms: 98,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingDues: 0,
    bookingRequests: 12,
    moveOutRequests: 4,
    openTickets: 7,
  },
  {
    id: '2',
    name: 'Green Valley Heights',
    address: 'Sector 18, Gurgaon',
    totalRooms: 80,
    occupiedRooms: 65,
    monthlyRevenue: 89000,
    monthlyExpenses: 18000,
    pendingDues: 23000,
    bookingRequests: 8,
    moveOutRequests: 2,
    openTickets: 3,
  },
  {
    id: '3',
    name: 'Sunrise Residency',
    address: 'Koramangala, Bangalore',
    totalRooms: 150,
    occupiedRooms: 142,
    monthlyRevenue: 198000,
    monthlyExpenses: 35000,
    pendingDues: 67000,
    bookingRequests: 15,
    moveOutRequests: 6,
    openTickets: 5,
  },
];

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(defaultProperties);
  const [currentProperty, setCurrentProperty] = useState<Property>(defaultProperties[0]);

  const addProperty = (property: Property) => {
    setProperties(prev => [...prev, property]);
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        currentProperty,
        setCurrentProperty,
        addProperty,
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