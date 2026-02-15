import { env } from '@/config/env';

const AUTH_TOKEN_KEY = 'urgentparts_token';
const AUTH_USER_KEY = 'urgentparts_user';

interface UserLike {
  token?: string;
}

interface ApiErrorEnvelope {
  error?: string;
  message?: string;
  detail?: string;
  code?: string;
  traceId?: string;
}

function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    return token;
  }

  const storedUser = localStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedUser) as UserLike;
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = readTokenFromStorage();
  const headers = new Headers(options?.headers ?? undefined);
  const isFormData = options?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const baseUrl = env.apiUrl.trim();
  const requestUrl = `${baseUrl}${path}`;

  const response = await fetch(requestUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `API Error: ${response.status}`;

    try {
      const errorBody = (await response.json()) as ApiErrorEnvelope;
      message = errorBody.message ?? errorBody.detail ?? errorBody.error ?? message;
      if (errorBody.traceId) {
        message = `${message} (trace: ${errorBody.traceId})`;
      }
    } catch {
      // Keep default status error.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}
