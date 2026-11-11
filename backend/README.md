# LearnSpace backend

The Express API runs on port `5000` by default. On first setup, configure MongoDB, JWT and administrator settings in a private `.env`, then start from this directory:

```bash
npm ci
Copy-Item .env.example .env
# Set MONGODB_URI, then replace the JWT/admin placeholders with private values.
npm run dev
```

The server connects to MongoDB before listening. `MONGODB_URI` is required; connection failure is reported without displaying the URI and prevents startup. `npm start` starts the same server without the development watcher. The API health check is `GET /api/health`.

The React/Vite frontend is served separately. From the repository root:

```powershell
cd .\frontend\src
npm ci
npm run dev
```

The Vite root is `frontend/`; the `frontend/src/` directory contains its package manifest.

## Authentication and API access

- `POST /api/auth/register`, `POST /api/auth/login`, and authenticated `GET /api/auth/me`
- Admin student management: `GET`, `POST` `/api/students`; authenticated self/admin profile reads with `GET /api/students/:id` and profile updates with `PATCH /api/students/:id`; admin-only `PUT` and `DELETE /api/students/:id`
- Public `GET` `/api/courses` and `/api/courses/:id`; admin-only `POST` `/api/courses` and `PUT`, `PATCH`, `DELETE` `/api/courses/:id`
- Course curriculum CRUD: `/api/courses/:courseId/modules`, `/api/modules/:id`, `/api/modules/:moduleId/lessons`, `/api/lessons/:id`, `/api/modules/:moduleId/quiz`. Students must be enrolled; reads expose lessons and quizzes only for unlocked modules. Final assessment reads and submissions require completion of every course module.
- Authenticated student enrollment and learning: `/api/enrollments`, `/api/progress`, `/api/progress/:id/lessons/:lessonId`, `/api/modules/:moduleId/quiz/attempts`, `/api/courses/:courseId/assessment/attempts`
- Assessment, certificate and notification reads: `/api/courses/:courseId/assessment`, `/api/certificates`, `/api/notifications`; admin manages assessments and creates notifications

Responses use `{ "success": true|false, "message": "...", "data": {} }`. Registration and resource creation return `201`; validation failures return `400`; missing/invalid/expired tokens return `401`; authenticated users without the required role return `403`; missing records return `404`; duplicate email or IDs return `409`.

## MongoDB persistence (Task 12)

User, Student, Course, Module, Lesson, Enrollment, Quiz, Progress, Assessment, Certificate, Notification, QuizAttempt and AssessmentAttempt records are stored through Mongoose. Quiz and final-assessment histories are separate documents; only the current two-attempt quiz window remains embedded in Progress, and Enrollment contains no attempt-history array. The enrollment and progress APIs include at most the latest 100 attempts per record. There is no automatic seed import or migration. The existing 30 catalog entries remain in `src/data/seedData.json`, but those entries do not contain the required 10-module curriculum and are not written as incomplete/fake database courses. Until real curriculum is entered by an administrator, the database-backed course list contains only persisted courses.

Course creation requires at least 10 module objects, each with at least one lesson and a five-question quiz; the API does not manufacture lesson or quiz content. **Student registration and the environment-configured admin account currently store credentials as plaintext in `User.passwordHash`. This is not production-safe; password hashing remains a known limitation.** Password values are never included in API responses or request logs. When an administrator creates a student through `POST /api/students` without a password, a random inaccessible temporary credential is generated; set a known password using an administrator student update before that account attempts login.

## Task 10 JWT and administrator configuration

Copy `.env.example` to `.env` and set a usable `MONGODB_URI`, random `JWT_SECRET` of at least 32 characters, `JWT_EXPIRES_IN` (for example `1h`), and private `ADMIN_EMAIL` / `ADMIN_PASSWORD` values before starting the backend. `ADMIN_USER_ID` is retained for configuration compatibility; database user IDs are MongoDB ObjectIds. `.env` is ignored by Git. Student tokens receive the `student` role; the environment-configured administrator receives `admin`. There is no public admin registration, and the configured admin email is reserved from student registration.

Send protected API requests with `Authorization: Bearer <token>`. Invalid or expired tokens return `401`; an authenticated user without permission receives `403`. Students can read and update only their own name, phone, college, department, and year of study; administrator-only student management and course mutations are restricted to `admin`. Course browsing and the health check remain public.

The React app stores its JWT session in tab-scoped `sessionStorage`, attaches the token to Express API requests, clears the session on `401` or logout, and guards student and administrator routes. The existing course, enrollment, module, lesson, quiz, assessment, certificate, notification, and progress pages load and save through the Express API. The dashboard reads and saves the authenticated student's profile. Administrator pages use database-backed student and course CRUD; creating a course requires the administrator to submit its real module, lesson, and quiz curriculum.

## Task 11 database schema

MongoDB with Mongoose is used by Task 12. The model definitions and collection relationship diagram are documented in [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) and [`docs/ER_DIAGRAM.md`](./docs/ER_DIAGRAM.md).

## Learning rules and limitations

- Enrollment creates one progress record per course module; only the first module starts unlocked. Completing every lesson in the current module to 100% unlocks the next one.
- A module quiz is limited to two attempts per student/module. After two failed attempts, persisted `lockedUntil` blocks attempts for 24 hours; an expired lock resets the attempt window on the next attempt. Passing ends further attempts.
- Quiz submission uses a conditional atomic Progress update and writes its durable history record in the same transaction. Configure MongoDB as a replica set (including Atlas or a local single-node replica set); standalone MongoDB does not support these transactions. Concurrent updates are retried by the MongoDB driver and rechecked against the current attempt count and lock.
- Final assessments require 20–30 questions, are available only after all course modules are complete, and have no quiz cooldown/attempt cap. A score at or above the configured passing percentage (minimum 50%) issues a persisted certificate.
- Other multi-document operations continue to use compensating cleanup rather than transactions.
- Existing catalog entries in `src/data/seedData.json` are not automatically inserted because they lack the required full curriculum. Configure a reachable `MONGODB_URI` and explicitly create or migrate complete course content before enrolling students.
