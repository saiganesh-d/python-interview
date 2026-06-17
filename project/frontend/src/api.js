// Tiny API helper. Demonstrates: JWT storage, Authorization header, fetch wrapper.
// (In a real app you'd add refresh-token logic and use a library like axios/React Query.)

const TOKEN_KEY = "access_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Generic JSON request that attaches the JWT and throws on non-2xx.
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.status === 204 ? null : res.json();
}

// --- Auth ---
export async function login(username, password) {
  const data = await request("/api/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access);
  return data;
}

// --- Notes CRUD ---
export const fetchNotes = (search = "") =>
  request(`/api/notes/${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const createNote = (title, body) =>
  request("/api/notes/", { method: "POST", body: JSON.stringify({ title, body }) });

export const deleteNote = (id) =>
  request(`/api/notes/${id}/`, { method: "DELETE" });
