# Task 15 — Deploy Application & Perform Testing

## Status and scope

This task adds deployment configuration, production environment-variable
guidance, repeatable CI checks, a backend health check, and a manual release
test plan. It preserves the existing Task 12 database/quiz behavior, Task 13
real-time chat and notifications, and Task 14 security work.

**Deployment status:** The repository is prepared for deployment, but no live
frontend/backend URL is claimed by this commit. A deployment owner must connect
the GitHub repository to Vercel and Render, create/configure a production MongoDB
database, and enter private environment variables in those hosting dashboards.

## Deployment files

- `render.yaml`: Render Node web service using `backend/` as its root and
  `/api/health` as its health check.
- `vercel.json`: SPA route fallback for React Router.
- `frontend/package.json` and `frontend/vite.config.js`: frontend package
  manifest and Vite configuration at the Vercel project root. The existing
  React source remains in `frontend/src/`.
- `frontend/.env.example`: public API URL setting (no secrets).
- `.github/workflows/ci.yml`: backend tests and frontend production build on
  pushes and pull requests.
- `backend/tests/health.test.js`: HTTP health, JSON 404, and security-header
  smoke tests.

## Deploy backend to Render

1. Push the repository to GitHub and create a new Render Blueprint from it,
   selecting the repository's `render.yaml`.
2. Set `MONGODB_URI` to the production MongoDB connection string.
3. Set `JWT_SECRET` to a newly generated random secret with at least 32
   characters. Do not reuse a development secret.
4. Set `ADMIN_EMAIL` and a private `ADMIN_PASSWORD` of at least 16
   characters. Keep all secrets in Render's environment settings.
5. Set `FRONTEND_URL` to the exact deployed Vercel origin (scheme + hostname,
   no trailing path). Multiple trusted origins may be comma-separated.
6. Deploy. Verify `https://YOUR-RENDER-SERVICE.onrender.com/api/health`
   returns HTTP 200 and JSON with `success: true` and `data.status: "ok"`.

Render supplies the runtime `PORT`; the backend reads it automatically.
Do not add credentials to GitHub or commit a real `.env` file.

## Deploy frontend to Vercel

1. Import this GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Set the build command to `npm run build` and output directory to `dist`.
   Vercel can use the included `vercel.json` for React Router routes.
4. Add the environment variable `VITE_EXPRESS_API_URL` with the complete
   deployed backend API base URL, including `/api`, for example
   `https://YOUR-RENDER-SERVICE.onrender.com/api`.
5. Deploy and open the frontend. If the Vercel hostname changes, update
   Render's `FRONTEND_URL` to the exact current origin and redeploy the API.

The frontend uses the same API base URL for REST requests and derives the
Socket.IO server origin by removing the final `/api` segment.

## Production MongoDB

Create a dedicated production database and database user. Copy the connection
string into Render's `MONGODB_URI` setting, replacing the database name and
credentials. Configure MongoDB Atlas Network Access to permit the Render
service's outbound connections according to your Atlas plan. Never put the
connection string in frontend variables or source control.

## Automated checks

GitHub Actions runs:

- `cd backend && npm install && npm test`: password hashing tests and API
  health/404/security-header smoke tests.
- `cd frontend && npm install && npm run build`: Vite production build.

Check the Actions tab on GitHub for the actual run result. A workflow file in
the repository is not proof that a run passed.

## Release test checklist

Run these tests against the deployed URLs after configuration:

| Area | Test | Expected result |
|---|---|---|
| Health | GET `/api/health` | HTTP 200; healthy JSON |
| Registration | POST `/api/auth/register` with valid unique student details | Success; user can sign in |
| Validation | Submit missing/invalid registration fields | HTTP 400; readable error |
| Login | POST `/api/auth/login` with correct credentials | Token and user returned |
| Authentication | Call protected API without token / with invalid token | HTTP 401 |
| Authorization | Student calls an admin-only endpoint | HTTP 403 |
| Student CRUD | Register, read/update own profile; admin creates/updates/deletes student | Correct persisted results and access controls |
| Course CRUD | Admin creates, reads, updates, and deletes a test course | Changes persist in production DB |
| Learning | Enroll, access curriculum, submit module quiz and assessment | Correct server-side state and attempt rules |
| Quiz cooldown | Fail a module quiz twice, retry before 24 hours, then retry after cooldown | Locked before expiry; two fresh attempts after expiry |
| Real-time | Open two authenticated browser sessions and send chat/notification events | Recipient receives updates without refresh |
| Responsive | Inspect home, login, registration, dashboards and chat at mobile/tablet/desktop widths | No horizontal overflow or broken controls |
| Security | Try disallowed CORS origin, malformed JSON, oversized body and unknown route | Correct 403/400/413/404 responses |

Use Postman for REST requests and two separate browser sessions for the
Socket.IO check. Do not use real student data for test accounts.

## Known verification limits

The automated tests in this task are smoke tests, not a substitute for the
complete production checklist above. Database CRUD, role permissions, quiz
cooldown, registration/login against production MongoDB, browser responsiveness,
and two-user Socket.IO behavior must be verified with the configured database
and deployed services. No live URL or successful deployment is recorded until
those checks actually occur.
