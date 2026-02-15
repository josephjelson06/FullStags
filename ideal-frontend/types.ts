
export type Role = 'ADMIN' | 'BUYER' | 'SUPPLIER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  company: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  supplierId: string;
}

export interface Supplier {
  id: string;
  name: string;
  rating: number;
  location: { lat: number; lng: number };
  stockAvailability: number;
  distance: number; // in km (mock)
  matchScore?: number;
}

export interface Order {
  id: string;
  partName: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DISPUTED' | 'MATCHING' | 'CANCELLED';
  buyer: string;
  supplier: string;
  eta: string;
  timestamp: string;
  pickTimeSLA?: number; // seconds
}

export interface Notification {
  id: string;
  type: 'ORDER' | 'WARNING' | 'RBAC' | 'SYSTEM' | 'PAYMENT';
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'NORMAL' | 'CRITICAL';
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface MatchReason {
  query: string;
  score: number;
  rank: number;
  reasons: string[];
}
