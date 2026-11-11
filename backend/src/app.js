import cors from "cors";
import express from "express";
import corsOptions from "./config/corsOptions.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import requestLogger from "./middleware/requestLogger.js";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import learningRoutes from "./routes/learningRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { authenticate } from "./middleware/authenticate.js";
import sanitizeInput from "./middleware/sanitizeInput.js";
import securityHeaders from "./middleware/securityHeaders.js";

const app = express();

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb", parameterLimit: 100 }));
app.use(sanitizeInput);
app.use("/api", (_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});
app.use("/api", apiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", authenticate, studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api", learningRoutes);
app.use("/api/messages", authenticate, messageRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
