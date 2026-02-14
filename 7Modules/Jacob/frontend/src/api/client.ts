const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const getTestUserHeader = () => {
  const stored = localStorage.getItem("x-test-user");
  if (stored) {
    return stored;
  }
  const fallback = JSON.stringify({ user_id: 1, role: "supplier" });
  localStorage.setItem("x-test-user", fallback);
  return fallback;
};

const getBearerToken = () => {
  return localStorage.getItem("auth_token");
};

const buildHeaders = (isForm: boolean) => {
  const headers: Record<string, string> = {};
  const bearerToken = getBearerToken();
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  } else {
    headers["X-Test-User"] = getTestUserHeader();
  }
  if (!isForm) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  isForm = false
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`,
    {
      ...options,
      headers: {
        ...buildHeaders(isForm),
        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
