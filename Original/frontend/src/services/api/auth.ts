import { request } from '@/services/api/client';
import type {
  AuthTokenDto,
  RegisterBuyerDto,
  RegisterSupplierDto,
  UserProfileDto,
} from '@/services/api/contracts';

export async function registerBuyer(data: RegisterBuyerDto): Promise<AuthTokenDto> {
  return request<AuthTokenDto>('/api/auth/register/buyer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerSupplier(data: RegisterSupplierDto): Promise<AuthTokenDto> {
  return request<AuthTokenDto>('/api/auth/register/supplier', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(email: string, password: string): Promise<AuthTokenDto> {
  return request<AuthTokenDto>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function me(): Promise<UserProfileDto> {
  return request<UserProfileDto>('/api/auth/me');
}
