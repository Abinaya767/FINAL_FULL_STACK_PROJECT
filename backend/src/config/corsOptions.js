const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const trustedVercelOrigins = new Set([
  "https://student-management-system-nu-five.vercel.app",
  "https://student-management-system-ill13wvdw-haskies.vercel.app",
]);

const isTrustedLearnSpaceVercelOrigin = (origin) =>
  /^https:\/\/student-management-system(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);

const allowedOrigins = new Set([
  ...trustedVercelOrigins,
  ...configuredOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export default {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isTrustedLearnSpaceVercelOrigin(origin)) {
      return callback(null, true);
    }
    const error = new Error("Origin is not allowed by the LearnSpace API.");
    error.status = 403;
    return callback(error);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 600,
};
