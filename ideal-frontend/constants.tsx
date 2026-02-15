
import { Part, Supplier, Order, Notification, User, MatchReason } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Marcus Vane', email: 'm.vane@tesla.com', role: 'BUYER', company: 'Tesla Gigafactory', status: 'ACTIVE' },
  { id: 'u2', name: 'Sarah Chen', email: 's.chen@globalparts.com', role: 'SUPPLIER', company: 'Global Parts Solutions', status: 'ACTIVE' },
  { id: 'u3', name: 'Admin Prime', email: 'admin@urgentparts.com', role: 'ADMIN', company: 'UrgentParts HQ', status: 'ACTIVE' },
  { id: 'u4', name: 'Jack Reacher', email: 'j.reacher@supplier.io', role: 'SUPPLIER', company: 'Midwest Hub', status: 'SUSPENDED' },
];

export const MOCK_PARTS: Part[] = [
  { id: '1', name: 'Hydraulic Pressure Sensor', sku: 'HPS-4420', category: 'Sensors', price: 349.99, stock: 3, supplierId: 's1' },
  { id: '2', name: 'Servo Motor SM-400', sku: 'SM-400', category: 'Motors', price: 1250.00, stock: 12, supplierId: 's2' },
  { id: '3', name: 'Conveyor Belt Tensioner', sku: 'CBT-7801', category: 'Mechanical', price: 124.50, stock: 1, supplierId: 's1' },
  { id: '4', name: 'Thermal Relay Switch', sku: 'TRS-2200', category: 'Electrical', price: 189.99, stock: 5, supplierId: 's1' },
  { id: '5', name: 'Ball Bearing 6205', sku: 'BB-6205', category: 'Mechanical', price: 12.00, stock: 20, supplierId: 's1' },
  { id: '6', name: 'O-Ring Kit X-99', sku: 'ORK-99', category: 'Mechanical', price: 25.00, stock: 0, supplierId: 's1' },
  { id: '7', name: 'Pneumatic Valve PV-2', sku: 'PV-2-A', category: 'Pneumatics', price: 89.00, stock: 15, supplierId: 's1' },
  { id: '8', name: 'CNC Cutting Head T4', sku: 'CNC-T4', category: 'CNC Tools', price: 2450.00, stock: 2, supplierId: 's1' },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'FastParts Distribution', rating: 4.9, location: { lat: 41.8781, lng: -87.6298 }, stockAvailability: 98, distance: 12 },
  { id: 's2', name: 'Global Parts Solutions', rating: 4.5, location: { lat: 41.8819, lng: -87.6231 }, stockAvailability: 88, distance: 5 },
];

export const MOCK_ORDERS: Order[] = [
  { id: 'UP-8821', partName: 'Servo Motor SM-400', status: 'IN_TRANSIT', buyer: 'Tesla Giga-Factory', supplier: 'FastParts Distribution', eta: '12 mins', timestamp: '2023-10-24 14:20' },
  { id: 'UP-8904', partName: 'Hydraulic Pressure Sensor', status: 'MATCHING', buyer: 'SpaceX Starbase', supplier: 'FastParts Distribution', eta: '3 mins', timestamp: '2023-10-24 14:45' },
  { id: 'ORD-1026', partName: 'Thermal Relay Switch', status: 'DELIVERED', buyer: 'FedEx Hub', supplier: 'FastParts Distribution', eta: '0 min', timestamp: '2023-10-24 12:30' },
  { id: 'ORD-1027', partName: 'Ball Bearing 6205', status: 'DELIVERED', buyer: 'Caterpillar Inc', supplier: 'FastParts Distribution', eta: '0 min', timestamp: '2023-10-24 11:00' },
  { id: 'ORD-0999', partName: 'Gasket Set', status: 'CANCELLED', buyer: 'Boeing WA', supplier: 'FastParts Distribution', eta: '--', timestamp: '2023-10-23 09:15' },
];

export const MOCK_HISTORY: Order[] = [
  { id: 'UP-7721', partName: 'CNC Head T2', status: 'DELIVERED', buyer: 'Ford Dearborn', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-20 09:12' },
  { id: 'UP-7722', partName: 'Pressure Valve Z4', status: 'DELIVERED', buyer: 'Intel AZ', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-20 11:45' },
  { id: 'UP-7723', partName: 'O-Ring Kit', status: 'DELIVERED', buyer: 'GM Detroit', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-21 14:20' },
  { id: 'UP-7724', partName: 'Servo Cable', status: 'DELIVERED', buyer: 'Tesla NV', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-21 16:05' },
  { id: 'UP-7725', partName: 'Hydraulic Fluid', status: 'DISPUTED', buyer: 'Amazon Fulfillment', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-22 08:30' },
  { id: 'UP-7726', partName: 'Limit Switch', status: 'DELIVERED', buyer: 'Blue Origin', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-22 10:15' },
  { id: 'UP-7727', partName: 'Drive Belt', status: 'DELIVERED', buyer: 'Microsoft Data Center', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-22 13:45' },
  { id: 'UP-7728', partName: 'Thermal Sensor', status: 'DELIVERED', buyer: 'Apple Cupertino', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-23 09:50' },
  { id: 'UP-7729', partName: 'Relay Module', status: 'DELIVERED', buyer: 'Lockheed Martin', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-23 11:10' },
  { id: 'UP-7730', partName: 'Encoder Wheel', status: 'DELIVERED', buyer: 'Northrop Grumman', supplier: 'FastParts Distribution', eta: '0m', timestamp: '2023-10-23 15:30' },
];

export const MOCK_MATCHES: MatchReason[] = [
  { query: "Urgent: 400V Servo Motor within 50km", score: 98, rank: 1, reasons: ["Closest Inventory", "Fastest SLA", "Preferred Supplier"] },
  { query: "Hydraulic Sensors Priority 1", score: 95, rank: 1, reasons: ["Exact SKU Match", "Same-day History"] },
  { query: "Pneumatic Valve Emergency Request", score: 92, rank: 2, reasons: ["Local Warehouse", "24/7 Dispatch Ready"] },
  { query: "CNC Tooling - High Precision", score: 88, rank: 3, reasons: ["Certified Tooling", "Bulk Availability"] },
];
