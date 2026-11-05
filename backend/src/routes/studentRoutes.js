import { Router } from "express";
import {
  createStudent,
  deleteStudent,
  getStudent,
  getStudents,
  patchStudent,
  updateStudent,
} from "../controllers/studentController.js";
import { authorizeRoles, authorizeSelfOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.route("/")
  .get(authorizeRoles("admin"), getStudents)
  .post(authorizeRoles("admin"), createStudent);
router.route("/:id")
  .get(authorizeSelfOrAdmin, getStudent)
  .put(authorizeRoles("admin"), updateStudent)
  .patch(authorizeSelfOrAdmin, patchStudent)
  .delete(authorizeRoles("admin"), deleteStudent);

export default router;
