interface FrontendEnv {
  apiUrl: string;
  useMock: boolean;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return defaultValue;
}

export const env: FrontendEnv = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  useMock: parseBoolean(import.meta.env.VITE_USE_MOCK, false),
};
