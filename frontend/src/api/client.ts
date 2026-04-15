const BASE_URL = '/api';

type RequestOptions = RequestInit & { params?: Record<string, string> };

async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = opts;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const token = localStorage.getItem('token');

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    // Backend has two error shapes:
    //   validate middleware → { message, details[] }
    //   errorHandler       → { error, code?, details? }
    // Show the first validation detail when available — most specific message.
    const message =
      (Array.isArray(body.details) && body.details[0]) ||
      body.error ||
      body.message ||
      'Request failed';
    const err = new Error(message) as Error & {
      status: number;
      code?: string;
    };
    err.status = res.status;
    err.code = body.code;
    throw err;
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
