
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_EXPRESS_API_URL || "http://127.0.0.1:3001",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

export function getApiErrorMessage(error, fallback = "The request could not be completed. Please try again.") {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && !error.isAxiosError) {
    return error.message;
  }
  if (error?.code === "ECONNABORTED" || error?.code === "ERR_NETWORK") {
    return "The LearnSpace API is unavailable. Please try again later.";
  }
  return fallback;
}

export default api;
