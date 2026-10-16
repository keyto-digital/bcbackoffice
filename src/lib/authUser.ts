const AUTH_API_URL = (import.meta.env.VITE_AUTH_API_URL || "http://localhost:3001").replace(/\/+$/, "");

export type CustomUser = {
  id: string; name: string; role: string | null; access: string[];
  entity_id?: string | null; default_store_id?: string | null; store_access_scope?: string | null;
};

export async function authenticateUser(name: string, password: string): Promise<CustomUser> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name.trim(), password }),
    });
  } catch {
    throw new Error(`Tidak dapat menghubungi server login (${AUTH_API_URL}). Pastikan backend berjalan.`);
  }
  const payload = await response.json().catch(() => null) as { success?: boolean; message?: string; user?: CustomUser; token?: string } | null;
  if (!response.ok || !payload?.success || !payload.user || !payload.token) throw new Error(payload?.message || "Login gagal. Periksa username dan password.");
  localStorage.setItem("custom_auth_token", payload.token);
  localStorage.setItem("custom_user", JSON.stringify(payload.user));
  return payload.user;
}

export function getCustomUser(): CustomUser | null {
  try { const stored = localStorage.getItem("custom_user"); return stored ? JSON.parse(stored) as CustomUser : null; }
  catch { return null; }
}
export function getCustomUserId(): string | null { return getCustomUser()?.id ?? null; }
export function getCustomAuthToken(): string | null { return localStorage.getItem("custom_auth_token"); }
export function clearCustomAuth(): void { localStorage.removeItem("custom_auth_token"); localStorage.removeItem("custom_user"); }
