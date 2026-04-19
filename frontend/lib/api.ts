const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getUsername() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('username');
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Auth
export async function registerUser(username: string, password: string, gemini_api_key?: string) {
  return apiFetch('/users/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, gemini_api_key }),
  });
}

export async function loginUser(username: string, password: string) {
  return apiFetch('/users/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Endpoints
export async function listEndpoints(username?: string) {
  const query = username ? `?username=${username}` : '';
  return apiFetch(`/list${query}`);
}

export async function registerEndpoint(payload: object) {
  return apiFetch('/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateEndpoint(username: string, endpointName: string, patch: object) {
  return apiFetch(`/${username}/${endpointName}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteEndpoint(username: string, endpointName: string) {
  return apiFetch(`/${username}/${endpointName}`, { method: 'DELETE' });
}

export { BASE_URL, getToken, getUsername };
