import { Router } from "express";
import * as learning from "../controllers/learningController.js";
import { getDashboardStatistics } from "../controllers/adminDashboardController.js";
import { getAdminAssessments } from "../controllers/assessmentAdminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

const router = Router();
const admin = [authenticate, authorizeRoles("admin")];
const signedIn = [authenticate];

router.get("/admin/dashboard/statistics", ...admin, getDashboardStatistics);
router.get("/admin/assessments", ...admin, getAdminAssessments);

router.get("/courses/:courseId/modules", ...signedIn, learning.getCourseModules);
router.post("/courses/:courseId/modules", ...admin, learning.createModule);
router.get("/modules/:id", ...signedIn, learning.getModule);
router.patch("/modules/:id", ...admin, learning.updateModule);
router.delete("/modules/:id", ...admin, learning.deleteModule);

router.get("/modules/:moduleId/lessons", ...signedIn, learning.getModuleLessons);
router.post("/modules/:moduleId/lessons", ...admin, learning.createLesson);
router.get("/lessons/:id", ...signedIn, learning.getLesson);
router.put("/lessons/:id", ...admin, learning.updateLesson);
router.patch("/lessons/:id", ...admin, learning.updateLesson);
router.delete("/lessons/:id", ...admin, learning.deleteLesson);

router.get("/modules/:moduleId/quiz", ...signedIn, learning.getModuleQuiz);
router.post("/modules/:moduleId/quiz", ...admin, learning.createModuleQuiz);
router.put("/modules/:moduleId/quiz", ...admin, learning.updateModuleQuiz);
router.patch("/modules/:moduleId/quiz", ...admin, learning.updateModuleQuiz);
router.delete("/modules/:moduleId/quiz", ...admin, learning.deleteModuleQuiz);
router.post("/modules/:moduleId/quiz/attempts", ...signedIn, learning.submitModuleQuiz);

router.get("/courses/:courseId/assessment", ...signedIn, learning.getCourseAssessment);
router.post("/courses/:courseId/assessment", ...admin, learning.createCourseAssessment);
router.put("/courses/:courseId/assessment", ...admin, learning.updateCourseAssessment);
router.patch("/courses/:courseId/assessment", ...admin, learning.updateCourseAssessment);
router.delete("/courses/:courseId/assessment", ...admin, learning.deleteCourseAssessment);
router.post("/courses/:courseId/assessment/attempts", ...signedIn, learning.submitFinalAssessment);

router.route("/enrollments")
  .get(...signedIn, learning.getEnrollments)
  .post(...signedIn, learning.createEnrollment);
router.get("/enrollments/:id", ...signedIn, learning.getEnrollment);
router.delete("/enrollments/:id", ...signedIn, learning.deleteEnrollment);

router.get("/progress", ...signedIn, learning.getProgress);
router.get("/progress/:id", ...signedIn, learning.getProgressRecord);
router.patch("/progress/:id/lessons/:lessonId", ...signedIn, learning.completeLesson);

router.get("/certificates", ...signedIn, learning.getCertificates);
router.get("/certificates/:id", ...signedIn, learning.getCertificate);
router.get("/notifications", ...signedIn, learning.getNotifications);
router.post("/notifications", ...admin, learning.createNotification);
router.get("/notifications/:id", ...signedIn, learning.getNotification);
router.patch("/notifications/:id/read", ...signedIn, learning.markNotificationRead);
router.delete("/notifications/:id", ...signedIn, learning.deleteNotification);

export default router;
