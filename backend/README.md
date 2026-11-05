# LearnSpace backend

The Express API runs on port `5000` by default. Start it from this directory:

```bash
npm install
npm run dev
```

`npm start` starts the same server without the development watcher. The API health check is `GET /api/health`.

## Task 9 API

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET`, `POST` `/api/students` and `GET`, `PUT`, `PATCH`, `DELETE` `/api/students/:id`
- `GET`, `POST` `/api/courses` and `GET`, `PUT`, `PATCH`, `DELETE` `/api/courses/:id`

Responses use `{ "success": true|false, "message": "...", "data": {} }`. Registration and course creation return `201`; validation failures return `400`; invalid login credentials return `401`; missing records return `404`; duplicate email or IDs return `409`.

## Temporary Task 9 storage and authentication

Student, credential, and course changes are held in memory and reset when the backend restarts. The 30 seeded course records are loaded from `src/data/seedData.json`; the seed file is not rewritten by API operations. Since the existing seed data has no course levels, the API reports `"Not specified"` for their level until updated.

Authentication is development-only: passwords are kept as plaintext in a separate in-memory credential map so Task 9 can validate login without introducing Task 10 JWTs or Task 14 password hashing. Passwords are never included in API responses or request logs. Do not use this authentication or storage for production data.
