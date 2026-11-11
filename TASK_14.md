# Task 14 — Optimization, Security & Error Handling

Task 14 strengthens the existing LearnSpace backend without changing the Task 12
module-quiz attempt/cooldown behavior or Task 13 real-time chat and notifications.

## Security changes

- Passwords are stored as salted scrypt hashes (a password-hashing alternative
  to bcrypt). Password verification uses a constant-time comparison.
- Existing legacy plain-text student password records are upgraded to scrypt
  hashes after a successful login. New registrations and admin-created users
  are hashed before database persistence.
- JWTs are verified with the configured secret, issuer, audience, and HS256
  algorithm. Protected REST routes and Socket.IO connections require valid
  authentication.
- CORS accepts only origins listed in `FRONTEND_URL`. Multiple origins can be
  comma-separated; localhost and 127.0.0.1 variants are supported.
- Request bodies are size-limited. Unsupported Mongo-style operator/dotted
  keys and excessively nested input are rejected. Existing controllers also
  validate field types, lengths, email formats, and allowed fields.
- Security response headers are added and Express's `X-Powered-By` header is
  disabled. API responses are marked `no-store`.
- Environment variables hold database credentials, JWT secrets, and admin
  credentials. Never commit `.env`.

## Reliability and optimization

- Central error middleware maps validation, duplicate-key, invalid-ID,
  malformed-JSON, oversized-body, and database-connectivity errors to useful
  HTTP status codes without exposing internal server details.
- Unknown endpoints return JSON 404 responses.
- Request logs include method, path, status, and duration; query strings are
  omitted to avoid logging tokens or personal information.
- Student email filtering is performed by MongoDB before population rather
  than filtering every loaded student in application memory.
- CORS preflight and request parameter limits are configured.

## Configuration

Copy `backend/.env.example` to `backend/.env` and set private values. Use a
random JWT secret of at least 32 characters and a private administrator
password of at least 16 characters. Add every deployed frontend origin to
`FRONTEND_URL`, separated by commas.

## Run and verify

```bash
cd backend
npm install
npm test
npm run dev
```

The automated Node test suite checks salted password hashing, successful and
failed password verification, and rejection of weak passwords. Also verify
with Postman: invalid JSON (400), invalid input (400), duplicate email (409),
missing/invalid JWT (401), forbidden CORS origin (403), unknown route (404),
and oversized JSON body (413). Confirm a successful registration stores a
scrypt hash in MongoDB, never the original password.

Database-backed and browser/Postman integration checks require the project's
configured MongoDB instance and are not claimed as executed by this commit.
