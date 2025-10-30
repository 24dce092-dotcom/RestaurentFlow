export function apiUrl(path) {
  const runtimeBase = (typeof window !== 'undefined') ? (window.__BACKEND_URL__ || (function(){ try { return localStorage.getItem('backend_url') || ''; } catch { return ''; } })()) : '';
  const envBase = import.meta.env.VITE_BACKEND_URL || '';
  if (!path.startsWith('/')) path = '/' + path;
  // Highest priority: runtime override (lets APK change server without rebuild)
  if (runtimeBase) return String(runtimeBase).replace(/\/$/, '') + path;
  // If explicit backend provided at build-time, use it (works for production or when accessing from mobile)
  if (envBase) return String(envBase).replace(/\/$/, '') + path;
  // In dev with Vite, prefer relative "/api" so the dev server proxy handles cross-origin and mobile access.
  if (typeof window !== 'undefined') {
    // If caller already passed a path starting with /api, keep as-is; otherwise prefix /api
    if (path.startsWith('/api')) return path;
    return '/api' + path;
  }
  // Fallback for SSR/node contexts
  return 'http://localhost:5001' + path;
}
// Axios instance for API calls
import axios from 'axios';

// Determine backend base URL:
// 1) If VITE_BACKEND_URL is provided, use `${VITE_BACKEND_URL}/api`
// 2) Else, if running on localhost in the browser, default to http://localhost:5001/api
// 3) Else, fall back to '/api' so hosting proxy can route requests
const rawEnvUrl = import.meta.env.VITE_BACKEND_URL;
const envUrl = rawEnvUrl ? String(rawEnvUrl).replace(/\/$/, '') : '';
// Create axios instance with consistent backend URL detection
// Prefer runtime override > build-time env > relative '/api' for Vite
const runtimeBaseForAxios = (typeof window !== 'undefined') ? (window.__BACKEND_URL__ || (function(){ try { return localStorage.getItem('backend_url') || ''; } catch { return ''; } })()) : '';
let baseURL = '/api';
if (runtimeBaseForAxios) {
  baseURL = `${String(runtimeBaseForAxios).replace(/\/$/, '')}/api`;
} else if (envUrl) {
  baseURL = `${envUrl}/api`;
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
