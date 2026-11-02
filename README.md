# LearnSpace
## Student Course Management and Online Learning Platform

LearnSpace is a full-stack online learning platform concept that allows students to discover courses, enroll, study structured lessons, complete assessments, track learning progress, and access course-completion certificates. A private administrator portal will support course and student management.

> **Task 01 scope:** This deliverable establishes the repository, project documentation, and initial folder structure. Application pages, APIs, database models, authentication, and other later-task features are intentionally not implemented yet.

## Problem statement
Learners need a single, organized place to discover courses, enroll in them, follow lessons in sequence, complete quizzes and assessments, and track their progress. Administrators also need a controlled way to manage course content and student access. LearnSpace is planned to address these needs through a student-facing learning experience and a separate private admin portal.

## Project objectives
- Provide a public course catalogue for visitors.
- Support student registration and login.
- Let authenticated students enroll in courses and learn through modules and lessons.
- Track lesson completion and course progress using actual application data.
- Assess learning through module quizzes and a final assessment.
- Make course-completion certificate records available to eligible students.
- Give authorized administrators tools to manage courses and students.
- Protect private student data and assessment answer keys.

## Target users
### Students
People who want to browse available courses, create an account, enroll, learn at their own pace, complete assessments, and track their learning history.

### Administrators
Authorized platform operators who manage courses, modules, lessons, quizzes, assessments, and student records through a private portal.

## Planned features
### Student-facing
- Public home, about, course catalogue, course details, and contact pages.
- Student registration, login, and profile.
- Enrollments and saved courses.
- Student dashboard and learning history.
- Course modules, lessons, and completion tracking.
- Module quizzes and a final assessment.
- Notifications and support messaging.
- Certificate records and PDF access after eligibility is met.

### Admin portal
- Private admin login; no public admin registration.
- Database-backed dashboard and activity summaries.
- Course creation, editing, drafting, publishing, and deletion.
- Module, lesson, quiz, and final-assessment management.
- Student search, profile view, and learning-progress review.
- Appropriate role-based access controls.

### Product decisions
- Do not add course thumbnails or unnecessary decorative imagery.
- Do not fabricate reviews, testimonials, student counts, popularity rankings, or dashboard statistics.
- Each module quiz is planned to contain exactly five questions.
- Module quizzes and the final assessment are planned to allow at most two attempts each; enforcement belongs on the backend.
- Certificate layout will be based on a reference design supplied by the project owner later. No certificate design is created in Task 01.
- **Visual direction:** avoid green. The final colour palette will be selected in a later UI-design task; Task 01 does not implement visual styling.

## Technology stack
| Area | Planned technology |
|---|---|
| Markup and styling | HTML5, CSS3 |
| Frontend language | JavaScript |
| Frontend framework and build | React, Vite |
| Routing | React Router |
| HTTP client | Axios |
| Backend runtime and framework | Node.js, Express.js |
| API style | REST, versioned under `/api/v1` |
| Database and ODM | MongoDB, Mongoose |
| Authentication | JWT, bcryptjs |
| Real-time communication | Socket.IO |
| Development and testing | Git, GitHub, VS Code, Postman, MongoDB Compass, npm |

## Initial folder structure
```text
LearnSpace/
├── frontend/             # React/Vite application (later tasks)
├── backend/              # Express API (later tasks)
├── docs/                 # Project and technical documentation
├── README.md
├── TASK_SUBMISSION.md
└── .gitignore
```

The frontend and backend folders are intentionally kept separate. Their implementation-specific subfolders will be added in the corresponding tasks.

## Prerequisites (for later implementation)
- Git
- Node.js LTS and npm
- MongoDB Community Server or a MongoDB hosted deployment
- VS Code (recommended)
- Postman (for API testing)

## Current Task 01 setup
Task 01 is documentation and repository setup only. There are no application dependencies to install and no frontend or backend server to run yet.

```bash
# From the project directory
git status
```

To begin later application tasks, work from this repository and follow each task in order. Do not treat the planned features above as already implemented.

## Planned local development commands (once the relevant tasks are implemented)
Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
npm install
npm run dev
```

These commands are forward-looking setup guidance; the package manifests and runnable applications are added in later tasks.

## Security and project conventions
- Never commit `.env` files, credentials, private keys, or production secrets.
- Public student registration must create student accounts only.
- Admin accounts must be provisioned through a private, authorized process.
- Enforce authorization, quiz attempt limits, grading, and progress rules on the server.
- Keep correct quiz answers out of public course responses.
- Document and test features before describing them as working.

## Task roadmap
The project is planned across 15 cumulative tasks:
1. Repository and project documentation.
2. Semantic HTML application structure.
3. CSS and responsive design.
4. JavaScript validation and navigation.
5. Reusable JavaScript modules and state management.
6. React components and routing.
7. Mock API integration.
8. Node.js and Express backend.
9. Student and course REST APIs.
10. JWT authentication and protected routes.
11. MongoDB schema design.
12. Database integration and CRUD.
13. Real-time chat and notifications.
14. Security, optimization, and error handling.
15. Testing and deployment.

Each task submission is cumulative and must preserve the work completed in previous tasks.
