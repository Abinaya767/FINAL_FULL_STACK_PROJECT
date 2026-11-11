# LearnSpace database schema — Task 11

## Scope and database technology

The project uses MongoDB with Mongoose. This document describes the original Task 11 model design and the Task 12 attempt-history collections added to keep unlimited histories out of bounded enrollment and progress documents. Task 12 persistence and CRUD operations were exercised against a local MongoDB instance; existing catalog records are not automatically migrated. The local verification instance is standalone, so it cannot run the transaction-backed module-quiz submission path; use Atlas or a local replica set for that operation. Password hashing remains outside this task; `passwordHash` is the intended field name, but the current Task 12 authentication implementation does not hash credentials.

All primary IDs are MongoDB `_id` ObjectIds. References use `mongoose.Schema.Types.ObjectId` with the target model in `ref`. Mongoose references do not enforce that a referenced record exists or that two related documents agree; those rules must be verified by Task 12 business logic.

## Models, fields, and validation

Required fields are explicitly marked below. Other fields are optional or carry a default. Every model except where noted uses Mongoose timestamps (`createdAt` and `updatedAt`).

| Model / collection | Fields, types, references, and rules |
|---|---|
| **User** (`users`) | `name: String` required, 2–100 chars; `email: String` required, trimmed/lowercase, email format, max 254, unique; `passwordHash: String` required and excluded from normal queries; `role: String` required enum `student \| admin`, default `student`; `createdAt`, `updatedAt: Date` automatic. |
| **Student** (`students`) | `legacyId: String` optional/unique/sparse for Task 9 identifier compatibility; `user: ObjectId → User` required and unique; `phone: String` optional, max 32; `profile: Object` optional with `bio`, `college`, `department: String` and `yearOfStudy: Number` (1–20); `enrollments: ObjectId[] → Enrollment`, optional/default empty. Enrollment references must be synchronized by application logic. |
| **Course** (`courses`) | `legacyId: String` optional/unique/sparse for Task 9 identifier compatibility; `title: String`, `description: String`, `category: String`, `instructor: String` required; `duration`, `level: String` optional; `demo: Boolean` required/default false; `modules: ObjectId[] → Module` defaults empty but validates to at least 10 distinct references. |
| **Module** (`modules`) | `course: ObjectId → Course` required; `title: String` required; `description: String` optional; `order: Number` required integer ≥ 1; `lessons: ObjectId[] → Lesson`, optional/default empty; `quiz: ObjectId → Quiz` optional/default null. `(course, order)` is unique. |
| **Lesson** (`lessons`) | `module: ObjectId → Module` required; `title: String` and `content: String` required; `order: Number` required integer ≥ 1. `(module, order)` is unique. |
| **Enrollment** (`enrollments`) | `student: ObjectId → Student` and `course: ObjectId → Course` required; `enrolledAt: Date` required/default now; `status: String` enum `active \| completed \| cancelled`, default `active`. It does not embed final-assessment history. `(student, course)` is unique. |
| **Quiz** (`quizzes`) | `module: ObjectId → Module` required/unique; `questions: QuizQuestion[]` required and exactly 5; `attemptLimit: Number` fixed at 2; `cooldownMs: Number` fixed at 86,400,000 (24 hours). Each question requires a prompt, at least two non-empty options, and an integer `correctAnswerIndex` within the options array. Keep correct answers server-side. |
| **Progress** (`progresses`) | `student: ObjectId → Student`, `course: ObjectId → Course`, `module: ObjectId → Module` required; `completionPercentage: Number` required, 0–100/default 0; `status: String` enum `not_started \| in_progress \| completed`, default `not_started`; `unlockedAt: Date` optional/null; `completedLessons: ObjectId[] → Lesson` default empty; `quizPassed: Boolean` default false; `quizAttempts: Attempt[]` default empty, maximum 2 in the current attempt window; `lockedUntil: Date` optional/null. The bounded current-window attempt subdocument stores its ID, timestamp, score (0–100), and pass result. Full history is in the separate `QuizAttempt` collection. `completed` status must correspond exactly to 100%. `(student, course, module)` is unique. |
| **Assessment** (`assessments`) | `course: ObjectId → Course` required/unique; `questions: QuizQuestion[]` required, 20–30 questions; `totalQuestions: Number` required integer from 20–30 and equal to question count; `passingPercentage: Number` default 50, bounded 50–100. Do not expose correct answers to clients. |
| **Certificate** (`certificates`) | `student: ObjectId → Student` and `course: ObjectId → Course` required; `certificateId: String` optional until issuance and unique when set; `issuedAt: Date` optional/null; `eligibilityStatus: String` enum `ineligible \| eligible \| issued`, default `ineligible`. `(student, course)` is unique. Issued certificates require an ID and issue date. |
| **Notification** (`notifications`) | `student: ObjectId → Student` required; `title: String`, `message: String` required; `isRead: Boolean` required/default false; `createdAt: Date` required/default now; `updatedAt: Date` automatic. |
| **QuizAttempt** (`quizattempts`, Task 12 history) | One immutable record per accepted submission: `_id` is also the matching `Progress.quizAttempts` subdocument ID; `student`, `course`, `module`, `quiz`, and `progress: ObjectId` references required; `attemptedAt: Date`, `scorePercentage: Number` (0–100), `passed: Boolean` required; timestamps automatic. Indexed by student/module/time and progress/time. Each attempt is its own document so history can grow without increasing Progress document size. |
| **AssessmentAttempt** (`assessmentattempts`, Task 12 history) | One record per final-assessment submission: `enrollment`, `student`, `course`, and `assessment: ObjectId` references required; `attemptedAt: Date`, `scorePercentage: Number` (0–100), `passed: Boolean` required; timestamps automatic. Indexed by enrollment/time and student/course/time. This collection has no quiz cooldown or attempt cap; Enrollment remains bounded. |

`QuizQuestion` and the at-most-two current-window quiz-attempt summaries are embedded subdocuments. Full quiz and final-assessment attempt history is stored as individual `QuizAttempt` and `AssessmentAttempt` documents. The original 11 Task 11 models remain; the two history models are Task 12 persistence additions.

## LearnSpace rules

### Enforced by schema validation/indexes

- User email is required, normalized and unique.
- Courses must reference at least 10 distinct modules.
- Each module quiz must contain exactly 5 questions.
- A module quiz's attempt limit and cooldown are fixed at 2 and 24 hours.
- Progress records can store no more than 2 quiz attempts in an active window, with a lock expiry timestamp; full attempt history is separate and does not grow the Progress document.
- Progress completion status and percentage must agree.
- Course/module ordering, one quiz per module, and unique per-student enrollment/progress/certificate pairs use indexes.

### Task 12 service/business logic (not guaranteed by schema alone)

- After two **failed** quiz attempts, set `lockedUntil` to 24 hours after the second failure. Reject attempts before then; after cooldown, clear/reset the bounded attempt window. Task 12 uses a conditional atomic Progress update and writes the corresponding `QuizAttempt` in the same MongoDB transaction. Transaction-capable replica-set MongoDB is required for quiz submissions.
- Unlock the next module only after the prior module's progress reaches 100%. Task 12 records lesson completion and updates `Progress.unlockedAt`.
- Make the final assessment available only after every module in that course is complete; Task 12 checks all corresponding Progress records.
- Mark a certificate eligible/issue it only when every course module is 100% complete and the final assessment score meets its passing percentage (which cannot be below 50%). Task 12 stores each assessment attempt in `AssessmentAttempt` and creates a Certificate only on a qualifying pass.
- Verify all referenced User, Student, Course, Module, Lesson, Quiz, Enrollment and Assessment records exist and keep paired reference arrays/fields synchronized. Task 12 validates module, lesson and quiz references during enrollment; other relationships are checked at the relevant persistence operations.

## ER diagram

See [`ER_DIAGRAM.md`](./ER_DIAGRAM.md) for the Mermaid collection relationship diagram.
