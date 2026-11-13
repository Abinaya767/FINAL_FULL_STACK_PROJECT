import { clearAuthSession, getAuthSession } from "./authSession.js";

const apiBaseUrl = (import.meta.env.VITE_EXPRESS_API_URL || "https://learnspace-api-idh2.onrender.com/api").replace(/\/$/, "");

export async function expressRequest(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getAuthSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("The LearnSpace API is unavailable. Start the Express backend and try again.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The LearnSpace API returned an invalid response.");
  }

  if (response.status === 401) {
    clearAuthSession();
    window.parent.postMessage({ type: "learnspace:unauthorized" }, window.location.origin);
  }
  if (!response.ok) {
    const error = new Error(payload.message || "The API request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}
