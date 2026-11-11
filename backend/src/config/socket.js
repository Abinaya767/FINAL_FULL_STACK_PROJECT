import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";

export function attachSocketServer(httpServer, app) {
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",").map((origin) => origin.trim()).filter(Boolean)
    .flatMap((origin) => [origin, origin.replace("://localhost", "://127.0.0.1")]);
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token.trim()) {
      next(new Error("Authentication required."));
      return;
    }
    try {
      const payload = verifyToken(token);
      if (typeof payload.sub !== "string" || !["student", "admin"].includes(payload.role)) {
        next(new Error("Invalid authentication token."));
        return;
      }
      socket.data.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid or expired authentication token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.user.id}`);
  });

  app.set("io", io);
  return io;
}
