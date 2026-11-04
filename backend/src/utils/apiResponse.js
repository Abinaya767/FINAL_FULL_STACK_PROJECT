export function apiResponse(message, data = {}) {
  return { success: true, message, data };
}

export function apiError(message, data = {}) {
  return { success: false, message, data };
}
