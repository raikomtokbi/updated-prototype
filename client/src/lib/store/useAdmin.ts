import { useAuthStore } from "./authstore";

const BASE_HEADERS = () => {
  const { user } = useAuthStore.getState();
  return {
    "Content-Type": "application/json",
    "x-admin-role": user?.role ?? "super_admin",
  };
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
