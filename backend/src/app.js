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
import { authenticate } from "./middleware/authenticate.js";

const app = express();

app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", (_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});
app.use("/api", apiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", authenticate, studentRoutes);
app.use("/api/courses", courseRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
