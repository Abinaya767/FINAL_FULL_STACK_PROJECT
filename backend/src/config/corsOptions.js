const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set(configuredOrigins.flatMap((origin) => [
  origin, origin.replace("://localhost", "://127.0.0.1"),
]));
export default {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error("Origin is not allowed by the LearnSpace API.");
    error.status = 403;
    return callback(error);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 600,
};
