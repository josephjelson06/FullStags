import { request } from '@/services/api/client';

export interface MatchResult {
  order_item_id: number;
  part_name: string;
  candidates: {
    supplier_id: number;
    supplier_name: string;
    catalog_id: number;
    score: number;
    price: number;
    lead_time_hours: number;
    distance_km: number;
    reliability_score: number;
  }[];
}

export interface MatchLogEntry {
  id: number;
  order_item_id: number;
  supplier_id: number;
  supplier_name: string;
  rank: number;
  score: number;
  price_score: number;
  distance_score: number;
  reliability_score: number;
  lead_time_score: number;
  created_at: string;
}

export interface MatchConfig {
  weight_profiles: Record<string, {
    price: number;
    distance: number;
    reliability: number;
    lead_time: number;
  }>;
}

export async function runOrderMatching(orderId: number): Promise<MatchResult[]> {
  return request<MatchResult[]>(`/api/matching/order/${orderId}`, {
    method: 'POST',
  });
}

export async function runItemMatching(itemId: number): Promise<MatchResult> {
  return request<MatchResult>(`/api/matching/item/${itemId}`, {
    method: 'POST',
  });
}

export async function getMatchingLogs(orderItemId: number): Promise<MatchLogEntry[]> {
  return request<MatchLogEntry[]>(`/api/matching/logs/${orderItemId}`);
}

export async function getMatchConfig(): Promise<MatchConfig> {
  return request<MatchConfig>('/api/matching/config');
}

export async function updateMatchConfig(config: MatchConfig): Promise<MatchConfig> {
  return request<MatchConfig>('/api/matching/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function getPlacedOrders(): Promise<unknown[]> {
  return request<unknown[]>('/api/matching/orders/placed');
}
