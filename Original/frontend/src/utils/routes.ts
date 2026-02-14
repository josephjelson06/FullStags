import type { UserRole } from '@/types';

export function getRoleHomePath(role: UserRole): string {
  if (role === 'supplier') {
    return '/supplier/inventory';
  }

  if (role === 'admin') {
    return '/admin/dashboard';
  }

  return '/buyer/emergency';
}

export function getOrderDetailPath(role: UserRole, orderId: string): string {
  if (role === 'supplier') {
    return `/supplier/orders/${orderId}`;
  }

  if (role === 'admin') {
    return `/admin/orders/${orderId}`;
  }

  return `/buyer/orders/${orderId}`;
}
