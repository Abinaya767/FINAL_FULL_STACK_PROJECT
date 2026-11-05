const STORAGE_KEY = "learnspace.auth.v1";
const CHANGE_EVENT = "learnspace:auth-change";

export function getAuthSession() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (
      typeof session.token === "string"
      && session.user
      && typeof session.user.id === "string"
      && ["student", "admin"].includes(session.user.role)
    ) {
      return session;
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function saveAuthSession(token, user) {
  const session = { token, user };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return session;
}

export function clearAuthSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addAuthChangeListener(listener) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
