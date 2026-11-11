# Task 15 Submission — Deploy Application & Perform Testing

## Task
Prepare LearnSpace for production deployment and provide automated and manual
testing procedures.

## Implemented
- Added Render Blueprint configuration for the Express API, runtime environment,
  private environment variables, and health-check route.
- Added Vercel SPA route fallback and moved the Vite project manifest/config to
  the actual `frontend/` project root while preserving the existing React
  source in `frontend/src/`.
- Added a frontend API URL environment template.
- Added GitHub Actions jobs for backend tests and frontend production build.
- Added API smoke tests for health, unknown routes, and security headers.
- Added `TASK_15.md` with Render, Vercel, MongoDB, environment-variable, Postman,
  browser, real-time, and responsive testing instructions.

## Files added or updated
- `render.yaml`
- `frontend/vercel.json`
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/.env.example`
- `.github/workflows/ci.yml`
- `backend/tests/health.test.js`
- `backend/package.json`
- `TASK_15.md`
- `README.md`

Removed the old nested `frontend/src/package.json`,
`frontend/src/package-lock.json`, and `frontend/src/vite.config.js` because
the frontend app is configured to build from `frontend/`.

## Connection to previous tasks
This is the cumulative deployment/testing stage. It keeps the existing API,
MongoDB integration, student/course flows, Task 12 module-quiz attempt and
24-hour cooldown rules, Task 13 Socket.IO chat/notifications, and Task 14
security/error handling. No existing quiz or real-time business rules are
intentionally changed.

## How to run and test
Backend:
```bash
cd backend
npm install
npm test
npm start
```

Frontend:
```bash
cd frontend
npm install
npm run build
npm run dev
```

For production deployment and the complete manual verification checklist,
follow `TASK_15.md`.

## Verification status
The GitHub Actions workflow is configured to run backend tests and the Vite
production build. Check its actual GitHub Actions result before marking CI as
passed. Live deployment, production MongoDB CRUD, registration/login, JWT,
quiz cooldown, browser responsiveness, and two-user real-time tests remain
pending until hosting accounts, production environment variables, and a
production MongoDB database are configured. No unverified live URLs are
claimed.
