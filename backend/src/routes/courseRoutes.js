import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  patchCourse,
  updateCourse,
} from "../controllers/courseController.js";

const router = Router();

router.route("/")
  .get(getCourses)
  .post(createCourse);
router.route("/:id")
  .get(getCourse)
  .put(updateCourse)
  .patch(patchCourse)
  .delete(deleteCourse);

export default router;
