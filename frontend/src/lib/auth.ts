import { api } from "./api";

/**
 * Obtiene el token de autenticación del contexto o de localStorage como fallback.
 * @param contextToken Token del contexto de autenticación (puede ser null)
 * @returns El token si existe, o null
 */
export function getAuthToken(contextToken?: string | null): string | null {
  if (contextToken) return contextToken;
  return localStorage.getItem("token");
}

/**
 * Aplica el header de autorización a axios si hay token.
 * @param token Token de autenticación
 */
export function applyAxiosAuthHeader(token: string | null): void {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

/**
 * Obtiene el header de autorización para usar en fetch o websocket.
 * @param token Token de autenticación
 * @returns Objeto con el header Authorization
 */
export function getAuthHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Verifica si un token JWT está expirado.
 * @param token Token JWT
 * @returns true si el token está expirado o es inválido
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // convertir a milisegundos
    return Date.now() >= exp;
  } catch {
    return true;
  }
}

/**
 * Limpia los datos de autenticación del localStorage.
 */
export function clearAuthStorage(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  delete api.defaults.headers.common["Authorization"];
}
