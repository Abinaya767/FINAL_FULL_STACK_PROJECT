import { clearDemoState } from "./storage.js";

export function initializeNavigation() {
  document.querySelectorAll("body > header nav a, main a, body > footer a").forEach((link) => {
    if (link.textContent.trim().toLowerCase() !== "logout") {
      return;
    }

    link.addEventListener("click", () => {
      clearDemoState();
    });
  });
}
