export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function tokenExpiresSoon(token: string) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return !payload.exp || payload.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  const response = await fetch(API + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return null;
  }
  const pair = await response.json();
  localStorage.setItem("access_token", pair.access_token);
  localStorage.setItem("refresh_token", pair.refresh_token);
  return pair.access_token as string;
}

export async function getAccessToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  if (!token || tokenExpiresSoon(token)) return refreshAccessToken();
  return token;
}

export async function call(path: string, options: RequestInit = {}) {
  let token = path.startsWith("/auth/") ? null : await getAccessToken();
  const multipart = options.body instanceof FormData;
  const request = () => fetch(API + path, {
    ...options,
    headers: {
      ...(multipart ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  let response = await request();
  if (response.status === 401 && !path.startsWith("/auth/")) {
    token = await refreshAccessToken();
    if (token) response = await request();
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Erro inesperado" }));
    throw new Error(error.detail || "Erro inesperado");
  }
  return response.status === 204 ? null : response.json();
}
