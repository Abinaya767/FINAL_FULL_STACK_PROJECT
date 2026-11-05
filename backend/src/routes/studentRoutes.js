import { Router } from "express";
import {
  createStudent,
  deleteStudent,
  getStudent,
  getStudents,
  patchStudent,
  updateStudent,
} from "../controllers/studentController.js";

const router = Router();

router.route("/")
  .get(getStudents)
  .post(createStudent);
router.route("/:id")
  .get(getStudent)
  .put(updateStudent)
  .patch(patchStudent)
  .delete(deleteStudent);

export default router;
