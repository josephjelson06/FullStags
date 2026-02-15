import type { AuthTokenDto, UserProfileDto } from '@/services/api/contracts';
import type { GeoLocation, SessionUser, UserRole } from '@/types';

function toRole(value: string): UserRole {
  if (value === 'admin' || value === 'supplier' || value === 'buyer') {
    return value;
  }
  return 'buyer';
}

function fallbackAddress(profile: UserProfileDto): string {
  if (profile.role === 'buyer') {
    return profile.delivery_address ?? '';
  }
  if (profile.role === 'supplier') {
    return profile.warehouse_address ?? '';
  }
  return '';
}

function toLocation(profile: UserProfileDto): GeoLocation {
  return {
    lat: profile.latitude ?? 0,
    lng: profile.longitude ?? 0,
    address: fallbackAddress(profile),
  };
}

function toDisplayName(profile: UserProfileDto): string {
  return (
    profile.factory_name
    ?? profile.business_name
    ?? profile.email.split('@')[0]
  );
}

function toCompanyName(profile: UserProfileDto): string {
  return profile.factory_name ?? profile.business_name ?? 'UrgentParts';
}

export function toSessionUser(
  token: AuthTokenDto,
  profile: UserProfileDto,
): SessionUser {
  return {
    userId: token.user_id,
    email: profile.email,
    role: toRole(profile.role),
    displayName: toDisplayName(profile),
    companyName: toCompanyName(profile),
    token: token.access_token,
    location: toLocation(profile),
  };
}
