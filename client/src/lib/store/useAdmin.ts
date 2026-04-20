import { useAuthStore, getAuthToken } from "./authstore";

const BASE_HEADERS = (): Record<string, string> => {
  const { user } = useAuthStore.getState();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Kept for backwards compat with any middleware still inspecting it; the
  // server now derives the actual role from the verified JWT, not this header.
  if (user?.role) headers["x-admin-role"] = user.role;
  return headers;
};

async function adminFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { ...BASE_HEADERS(), ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const adminApi = {
  get: (path: string) => adminFetch(path),
  post: (path: string, body: unknown) =>
    adminFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    adminFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    adminFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => adminFetch(path, { method: "DELETE" }),
};
