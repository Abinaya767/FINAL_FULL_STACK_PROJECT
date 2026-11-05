import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  patchCourse,
  updateCourse,
} from "../controllers/courseController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

const router = Router();

router.route("/")
  .get(getCourses)
  .post(authenticate, authorizeRoles("admin"), createCourse);
router.route("/:id")
  .get(getCourse)
  .put(authenticate, authorizeRoles("admin"), updateCourse)
  .patch(authenticate, authorizeRoles("admin"), patchCourse)
  .delete(authenticate, authorizeRoles("admin"), deleteCourse);

export default router;
