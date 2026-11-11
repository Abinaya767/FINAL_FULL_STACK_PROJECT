# Task 12 — Database Integration and CRUD Operations

## Database connection

The Express server loads `backend/.env`, validates the JWT and administrator
configuration, and awaits the Mongoose connection before opening its HTTP
listener. A missing or unreachable MongoDB connection prevents startup and is
reported without printing the connection string. Configure the local
environment by copying `backend/.env.example` to `backend/.env` and supplying
private values. Environment files are Git-ignored; the example has placeholders
only.

Quiz-attempt writes use a MongoDB transaction so the bounded quiz window and
its history remain consistent. Use a transaction-capable replica set or
MongoDB Atlas. Other multi-document operations use compensating cleanup.

## Models and persisted operations

The 11 Task 11 models are reused without creating duplicate schemas. Two
additional Task 12 collections, `QuizAttempt` and `AssessmentAttempt`, record
assessment history separately from the bounded progress/enrollment records.
The relationship and validation details remain in
[`backend/docs/DATABASE_SCHEMA.md`](./backend/docs/DATABASE_SCHEMA.md) and
[`backend/docs/ER_DIAGRAM.md`](./backend/docs/ER_DIAGRAM.md).

Student registration and administrator student CRUD persist `User` and
`Student` records. Registration saves the entered college, department, and
study year. Profile edits update saved name, phone, college, department, and
study year.
Course CRUD persists courses and the submitted module, lesson, and quiz
curriculum; the API does not import incomplete seed content or fabricate
course records. Enrollment, lesson progress, module quiz and final-assessment
attempts, certificates, and notifications use their existing Mongoose models.

### Main API endpoints

All paths are prefixed with `/api`.

| Method and path | Access |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Public registration/login; authenticated current-user lookup |
| `GET /students`, `POST /students` | Administrator |
| `GET /students/:id`, `PATCH /students/:id` | Authenticated self or administrator |
| `PUT /students/:id`, `DELETE /students/:id` | Administrator |
| `GET /courses`, `GET /courses/:id` | Public |
| `POST /courses`, `PUT`/`PATCH`/`DELETE /courses/:id` | Administrator |
| `/courses/:courseId/modules`, `/modules/:id`, `/modules/:moduleId/lessons`, `/lessons/:id` | Authenticated reads; administrator writes |
| `/modules/:moduleId/quiz`, `/modules/:moduleId/quiz/attempts` | Enrolled students read and submit module quizzes |
| `/courses/:courseId/assessment`, `/courses/:courseId/assessment/attempts` | Enrolled students after course completion; administrator manages assessment |
| `GET`/`POST /enrollments`, `GET /progress`, `PATCH /progress/:id/lessons/:lessonId` | Authenticated |
| `GET /certificates`, `GET /notifications` | Authenticated |

Course creation requires at least 10 complete modules. Each module requires at
least one titled lesson and a quiz with exactly five questions, each containing
at least two options and a valid correct-answer index. Course CRUD is available
from the administrator course-management page. Administrator student CRUD is
available from the student-management pages; students can update their own
name, phone, and profile fields from the dashboard profile form.

The course-management JSON field accepts an array of module objects in this
shape. The values shown in angle brackets are placeholders, not course content;
replace them with real material and include five question objects per module:

```json
[
  {
    "title": "<module title>",
    "description": "<module description>",
    "lessons": [
      { "title": "<lesson title>", "content": "<lesson content>" }
    ],
    "quiz": {
      "questions": [
        {
          "question": "<question prompt>",
          "options": ["<option 1>", "<option 2>"],
          "correctAnswerIndex": 0
        }
      ]
    }
  }
]
```

## Assessment rules

Each module quiz allows two attempts. Two failed attempts persistently lock
that quiz for 24 hours; the attempt allowance resets when the lock expires.
These limits apply to module quizzes only. Final-assessment attempts are
persisted without a cap or cooldown and require completion of all course
modules.

## Frontend integration

The React/Vite application retains its existing routes and JWT session. Its
legacy pages now call the Express services for authentication, course
catalogue/details, enrollment, student and course management, profile updates,
module/lesson access, progress, quizzes, assessments, certificates, and
notifications. Loading, empty, and error states are shown for database-backed
views. Student and administrator API access remains role-protected.

## Local setup

```powershell
Copy-Item .\backend\.env.example .\backend\.env
# Set private values in backend\.env before starting the server.
cd .\backend
npm ci
npm run dev
```

In another terminal:

```powershell
cd .\frontend\src
npm ci
npm run dev
```

Check `GET http://localhost:5000/api/health`, then use Postman or the frontend
with real student/admin accounts to exercise CRUD. For protected requests send
`Authorization: Bearer <JWT>`. Restart the backend and retrieve records again
to confirm database persistence.

## Verification record

| Check | Result |
|---|---|
| MongoDB connection and backend startup | Passed against the local MongoDB service. The ignored `backend/.env` was missing `MONGODB_URI`; a local, credential-free URI was added. The database reports standalone mode. |
| Backend JavaScript syntax | Passed for all 37 backend source files. |
| Frontend production build | Passed with Vite; build output was directed to a temporary directory so the existing `frontend/dist` was not replaced. |
| Student registration, login, profile read/update, and student deletion | Passed through the live REST API, including college, department, and study year persistence. |
| Administrator student create/read/update/delete | Passed through the live REST API. |
| Course create/read/PUT/PATCH/delete | Passed through the live REST API with a complete temporary 10-module curriculum. |
| JWT and error handling | Passed: protected route returned `401` without a token, student access to admin listing returned `403`, invalid credentials returned `401`, invalid profile data returned `400`, duplicate email returned `409`, and missing records returned `404`. |
| Enrollment, module progress, lesson completion, and module unlocking | Passed. Ten module progress records persisted and completed in order. |
| Final assessment | Passed with three failed attempts recorded; no attempt cap or quiz cooldown was applied. |
| Persistence after backend restart | Passed. Course, student, enrollment, all 10 progress records, and all 3 assessment attempts were read after restarting the backend. Test records were then deleted. |
| Module-quiz attempt limit/cooldown submission | Not executable against this local standalone MongoDB: the implementation uses a transaction, and transactions require a replica set. Quiz question retrieval and answer-key redaction were verified; submission enforcement still requires testing against Atlas or a replica-set deployment. |
| Git secret exclusions | `.env`, dependency folders, and build output are ignored. `backend/.env` is not tracked; environment example values are placeholders. |

The configured password fields remain plaintext despite being named
`passwordHash`; password hashing was not included in this database-integration
task and is not production-safe. The live frontend production build passed;
interactive browser testing was not run.
