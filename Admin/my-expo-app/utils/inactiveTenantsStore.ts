import AsyncStorage from "@react-native-async-storage/async-storage";

export interface InactiveTenantSnapshot {
  id: string;
  uniqueId: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string;
  sex?: string;
  profession?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  aadhaarStatus?: string;
  kycStatus?: string;
  profileImage?: string;
  profileExtras?: Record<string, any>;
  roomId?: string;
  roomNumber?: string;
  floor?: string | number;
  propertyId?: string;
  propertyName?: string;
  moveInDate?: string;
  moveOutDate?: string;
  securityDeposit?: number;
  currentDue?: number;
  settlement?: {
    securityDepositReturned?: number;
    deductions?: number;
  };
  movedOutAt: string;
  moveOutRequestId?: string;
  status: "inactive";
}

const STORAGE_KEY = "admin.inactiveTenants.v1";

async function readAll(): Promise<InactiveTenantSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(tenants: InactiveTenantSnapshot[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
}

export async function getInactiveTenants(): Promise<InactiveTenantSnapshot[]> {
  return readAll();
}

export async function saveInactiveTenant(snapshot: InactiveTenantSnapshot): Promise<void> {
  const tenants = await readAll();
  const next = tenants.filter((tenant) => tenant.uniqueId !== snapshot.uniqueId && tenant.id !== snapshot.id);
  next.unshift(snapshot);
  await writeAll(next);
}
