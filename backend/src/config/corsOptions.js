const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = new Set([
  frontendUrl,
  frontendUrl.replace("://localhost", "://127.0.0.1"),
]);

export default {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("Origin is not allowed by the LearnSpace API.");
    error.status = 403;
    callback(error);
  },
};
