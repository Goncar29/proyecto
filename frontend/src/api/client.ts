const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api`;

type RequestOptions = RequestInit & { params?: Record<string, string> };

// ── Refresh-token logic ────────────────────────────────────────────────────────
// Only one refresh call at a time — concurrent 401s share the same promise.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Try to get a new access token via the httpOnly-cookie refresh token.
 * Returns the new access token, or null if the refresh fails.
 */
async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise; // deduplicate concurrent calls

  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // send the httpOnly cookie
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      const newToken: string | undefined = data.token;
      if (newToken) localStorage.setItem('token', newToken);
      return newToken ?? null;
    })
    .catch(() => null)
    .finally(() => { refreshPromise = null; });

  return refreshPromise;
}

/** Endpoints that should never trigger a refresh attempt */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// ── Core request function ──────────────────────────────────────────────────────
async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = opts;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const token = localStorage.getItem('token');

  const isFormData = rest.body instanceof FormData;

  const res = await fetch(url, {
    credentials: 'include', // always include cookies (refresh token cookie)
    headers: {
      // FormData: let the browser set Content-Type + boundary automatically
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  });

  if (!res.ok) {
    // 401 on a non-auth endpoint → try to refresh first, then retry once
    if (res.status === 401 && !AUTH_ENDPOINTS.some(e => endpoint.startsWith(e))) {
      const newToken = await tryRefresh();

      if (newToken) {
        // Retry the original request with the new token
        const retryRes = await fetch(url, {
          credentials: 'include',
          headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            Authorization: `Bearer ${newToken}`,
            ...headers,
          },
          ...rest,
        });

        if (retryRes.ok) return retryRes.json() as Promise<T>;

        // Retry also failed → give up
        if (retryRes.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login?expired=1';
          throw new Error('Session expired');
        }
      } else {
        // Refresh failed → session gone
        localStorage.removeItem('token');
        window.location.href = '/login?expired=1';
        throw new Error('Session expired');
      }
    }

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

  /**
   * Multipart upload — do NOT set Content-Type manually.
   * The browser adds it automatically with the correct boundary.
   * Uses request() so 401 retry logic applies the same as other methods.
   */
  postFile: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
