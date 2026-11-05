# LearnSpace backend

The Express API runs on port `5000` by default. On first setup, configure private JWT and administrator credentials, then start from this directory:

```bash
npm install
Copy-Item .env.example .env
# Edit .env and replace the JWT/admin placeholders with private values.
npm run dev
```

`npm start` starts the same server without the development watcher. The API health check is `GET /api/health`.

The React frontend is served separately. From the repository root:

```powershell
cd .\frontend\src
npm ci
npm run dev
```

The React app and previous standalone course pages are served by Vite from the `frontend/` directory.

## Authentication and API access

- `POST /api/auth/register`, `POST /api/auth/login`, and authenticated `GET /api/auth/me`
- Authenticated student profile and admin student management: `GET`, `POST` `/api/students` and `GET`, `PUT`, `PATCH`, `DELETE` `/api/students/:id`
- Public `GET` `/api/courses` and `/api/courses/:id`; admin-only `POST` `/api/courses` and `PUT`, `PATCH`, `DELETE` `/api/courses/:id`

Responses use `{ "success": true|false, "message": "...", "data": {} }`. Registration and resource creation return `201`; validation failures return `400`; missing/invalid/expired tokens return `401`; authenticated users without the required role return `403`; missing records return `404`; duplicate email or IDs return `409`.

## Temporary Task 9 storage and authentication

Student, credential, and course changes are held in memory and reset when the backend restarts. The 30 seeded course records are loaded from `src/data/seedData.json`; the seed file is not rewritten by API operations. Since the existing seed data has no course levels, the API reports `"Not specified"` for their level until updated.

Student passwords are still kept as plaintext in a separate in-memory credential map, as requested for this task sequence. Password hashing is deferred to Task 14; this temporary credential storage is not production-safe. Passwords are never included in API responses or request logs.

## Task 10 JWT and administrator configuration

Copy `.env.example` to `.env` and set a random `JWT_SECRET` of at least 32 characters, `JWT_EXPIRES_IN` (for example `1h`), and private `ADMIN_EMAIL` / `ADMIN_PASSWORD` values before starting the backend. `ADMIN_USER_ID` is optional. `.env` is ignored by Git. Student tokens receive the `student` role; the environment-configured administrator receives `admin`. There is no public admin registration, and the configured admin email is reserved from student registration.

Send protected API requests with `Authorization: Bearer <token>`. Invalid or expired tokens return `401`; an authenticated user without permission receives `403`. Students can read and update only their own profile (name and phone); administrator-only student management and course mutations are restricted to `admin`. Course browsing and the health check remain public.

The React app stores its JWT session in tab-scoped `sessionStorage`, attaches the token to its Express API requests, clears the session on `401` or logout, and guards student and administrator routes. Existing Task 7 mock API clients remain separate and continue using their mock API.

## Task 11 database schema

MongoDB with Mongoose is the planned database technology. Mongoose models and the collection relationship diagram are documented in [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) and [`docs/ER_DIAGRAM.md`](./docs/ER_DIAGRAM.md). The models are schema definitions only: the API still uses temporary in-memory storage, and no database connection or data migration is configured until Task 12.
