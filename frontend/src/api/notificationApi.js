import { expressRequest } from "./expressApi.js";

export async function getNotifications() {
  const result = await expressRequest("/notifications");
  return result.data.notifications;
}

export async function markNotificationRead(id) {
  const result = await expressRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    body: {},
  });
  return result.data.notification;
}

export async function deleteNotification(id) {
  await expressRequest(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
}
