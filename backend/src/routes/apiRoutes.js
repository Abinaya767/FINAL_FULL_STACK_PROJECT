import { Router } from "express";
import { health, test, welcome } from "../controllers/apiController.js";

const router = Router();

router.get("/", welcome);
router.get("/health", health);
router.get("/test", test);

export default router;
