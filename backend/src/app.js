import cors from "cors";
import express from "express";
import corsOptions from "./config/corsOptions.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import requestLogger from "./middleware/requestLogger.js";
import apiRoutes from "./routes/apiRoutes.js";

const app = express();

app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
