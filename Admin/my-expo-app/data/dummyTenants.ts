// Centralized dummy data for all tenants/customers in the admin app
// Import this file wherever you need tenant data

export interface Tenant {
  id: string;
  mystayId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  displayPhone: string;
  dob: string;
  photo: string;
  
  // Room & Property
  room: string;
  roomNumber: string;
  floor: string;
  propertyId: string;
  propertyName: string;
  
  // Financial
  monthlyRent: number;
  due: number;
  securityDeposit: number;
  
  // Dates
  moveInDate: Date;
  checkInDate: Date;
  
  // Status
  status: "active" | "inactive";
  kycStatus: "Verified" | "Pending" | "Rejected";
  moveOutRequested: boolean;
  
  // Documents
  aadhar: string;
  documents: {
    aadharFront: string;
    aadharBack: string;
    idFront: string;
    idBack: string;
    photo: string;
  };
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  
  // Additional
  bookingId?: string;
  tenancyDuration?: number;
}

export const DUMMY_TENANTS: Tenant[] = [
  {
    id: "customer_001",
    mystayId: "MYS001",
    name: "John Doe",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@email.com",
    phone: "+919876543210",
    displayPhone: "+91 98765 43210",
    dob: "15 Jan 1995",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    
    room: "101",
    roomNumber: "101",
    floor: "Ground Floor",
    propertyId: "property_001",
    propertyName: "Mahima Panorama",
    
    monthlyRent: 12000,
    due: 2500,
    securityDeposit: 15000,
    
    moveInDate: new Date("2024-06-15"),
    checkInDate: new Date("2024-06-15"),
    
    status: "active",
    kycStatus: "Verified",
    moveOutRequested: true,
    
    aadhar: "XXXX XXXX 3210",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    },
    
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "9123456789",
    
    bookingId: "booking_001",
  },
  {
    id: "customer_002",
    mystayId: "MYS002",
    name: "Jane Smith",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@email.com",
    phone: "+919876543211",
    displayPhone: "+91 98765 43211",
    dob: "22 Mar 1997",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
    
    room: "102",
    roomNumber: "102",
    floor: "Ground Floor",
    propertyId: "property_001",
    propertyName: "Mahima Panorama",
    
    monthlyRent: 10000,
    due: 0,
    securityDeposit: 12000,
    
    moveInDate: new Date("2024-08-20"),
    checkInDate: new Date("2024-08-20"),
    
    status: "active",
    kycStatus: "Verified",
    moveOutRequested: false,
    
    aadhar: "XXXX XXXX 4321",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
    },
    
    emergencyContactName: "John Smith",
    emergencyContactPhone: "9234567890",
    
    bookingId: "booking_002",
  },
  {
    id: "customer_003",
    mystayId: "MYS003",
    name: "Alex Brown",
    firstName: "Alex",
    lastName: "Brown",
    email: "alex.brown@email.com",
    phone: "+919876543222",
    displayPhone: "+91 98765 43222",
    dob: "10 Jul 1996",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    
    room: "201",
    roomNumber: "201",
    floor: "First Floor",
    propertyId: "property_001",
    propertyName: "Mahima Panorama",
    
    monthlyRent: 11000,
    due: 7800,
    securityDeposit: 13000,
    
    moveInDate: new Date("2024-09-10"),
    checkInDate: new Date("2024-09-10"),
    
    status: "active",
    kycStatus: "Verified",
    moveOutRequested: true,
    
    aadhar: "XXXX XXXX 5432",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    },
    
    emergencyContactName: "Sarah Brown",
    emergencyContactPhone: "9345678901",
    
    bookingId: "booking_003",
  },
  {
    id: "customer_004",
    mystayId: "MYS004",
    name: "Priya Patel",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@email.com",
    phone: "+918765432109",
    displayPhone: "+91 87654 32109",
    dob: "05 Dec 1998",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800",
    
    room: "202",
    roomNumber: "202",
    floor: "First Floor",
    propertyId: "property_001",
    propertyName: "Mahima Panorama",
    
    monthlyRent: 8500,
    due: 0,
    securityDeposit: 10000,
    
    moveInDate: new Date("2024-07-05"),
    checkInDate: new Date("2024-07-05"),
    
    status: "active",
    kycStatus: "Verified",
    moveOutRequested: false,
    
    aadhar: "XXXX XXXX 6543",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800",
    },
    
    emergencyContactName: "Raj Patel",
    emergencyContactPhone: "9456789012",
    
    bookingId: "booking_004",
  },
  {
    id: "customer_005",
    mystayId: "MYS005",
    name: "Rahul Sharma",
    firstName: "Rahul",
    lastName: "Sharma",
    email: "rahul.sharma@email.com",
    phone: "+919876543210",
    displayPhone: "+91 98765 43210",
    dob: "18 Sep 1994",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
    
    room: "301",
    roomNumber: "301",
    floor: "Second Floor",
    propertyId: "property_002",
    propertyName: "Green Valley PG",
    
    monthlyRent: 15000,
    due: 12000,
    securityDeposit: 18000,
    
    moveInDate: new Date("2024-05-25"),
    checkInDate: new Date("2024-05-25"),
    
    status: "active",
    kycStatus: "Verified",
    moveOutRequested: false,
    
    aadhar: "XXXX XXXX 7654",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
    },
    
    emergencyContactName: "Amit Sharma",
    emergencyContactPhone: "9567890123",
    
    bookingId: "booking_005",
  },
  {
    id: "customer_006",
    mystayId: "MYS006",
    name: "Sneha Reddy",
    firstName: "Sneha",
    lastName: "Reddy",
    email: "sneha.reddy@email.com",
    phone: "+916543210987",
    displayPhone: "+91 65432 10987",
    dob: "30 Nov 1999",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
    
    room: "302",
    roomNumber: "302",
    floor: "Second Floor",
    propertyId: "property_002",
    propertyName: "Green Valley PG",
    
    monthlyRent: 11000,
    due: 0,
    securityDeposit: 13000,
    
    moveInDate: new Date("2024-10-01"),
    checkInDate: new Date("2024-10-01"),
    
    status: "active",
    kycStatus: "Pending",
    moveOutRequested: false,
    
    aadhar: "XXXX XXXX 8765",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
    },
    
    emergencyContactName: "Lakshmi Reddy",
    emergencyContactPhone: "9678901234",
    
    bookingId: "booking_006",
  },
  {
    id: "customer_007",
    mystayId: "MYS007",
    name: "Old Member",
    firstName: "Old",
    lastName: "Member",
    email: "old.member@email.com",
    phone: "+919000000000",
    displayPhone: "+91 90000 00000",
    dob: "01 Jan 1990",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800",
    
    room: "—",
    roomNumber: "—",
    floor: "—",
    propertyId: "property_001",
    propertyName: "Mahima Panorama",
    
    monthlyRent: 0,
    due: 0,
    securityDeposit: 0,
    
    moveInDate: new Date("2023-01-01"),
    checkInDate: new Date("2023-01-01"),
    
    status: "inactive",
    kycStatus: "Verified",
    moveOutRequested: false,
    
    aadhar: "XXXX XXXX 9876",
    documents: {
      aadharFront: "https://via.placeholder.com/600x400?text=Aadhaar+Front",
      aadharBack: "https://via.placeholder.com/600x400?text=Aadhaar+Back",
      idFront: "https://via.placeholder.com/600x400?text=ID+Front",
      idBack: "https://via.placeholder.com/600x400?text=ID+Back",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800",
    },
    
    emergencyContactName: "Contact Person",
    emergencyContactPhone: "9789012345",
    
    bookingId: "booking_007",
  },
];

// Helper functions to get tenant data
export const getTenantById = (id: string): Tenant | undefined => {
  return DUMMY_TENANTS.find(tenant => tenant.id === id || tenant.mystayId === id);
};

export const getActiveTenants = (): Tenant[] => {
  return DUMMY_TENANTS.filter(tenant => tenant.status === "active");
};

export const getInactiveTenants = (): Tenant[] => {
  return DUMMY_TENANTS.filter(tenant => tenant.status === "inactive");
};

export const getTenantsWithDues = (): Tenant[] => {
  return DUMMY_TENANTS.filter(tenant => tenant.due > 0);
};

export const getTenantsByFloor = (floor: string): Tenant[] => {
  return DUMMY_TENANTS.filter(tenant => tenant.floor === floor);
};

export const getTenantsByProperty = (propertyId: string): Tenant[] => {
  return DUMMY_TENANTS.filter(tenant => tenant.propertyId === propertyId);
};

export const getTenantsWithMoveOutRequests = (): Tenant[] => {
  return DUMMY_TENANTS.filter(tenant => tenant.moveOutRequested === true);
};
