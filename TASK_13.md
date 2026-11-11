# Task 13 — Real-Time Chat and Notifications

Task 13 adds authenticated real-time communication while retaining the existing Express, MongoDB, JWT, React, and Vite application.

## Features
- Socket.IO connections verify the existing JWT (issuer, audience, algorithm, expiry, and role) before joining a private user room.
- Admin-created student notifications are saved using the existing Notification model and emitted to the intended student's authenticated room. The existing REST notification list and mark-as-read routes remain in use.
- One-to-one chat messages are stored in MongoDB. Students can chat with administrators and administrators can chat with students.
- Conversation history is loaded from the API; new messages are emitted to both participants without refreshing.
- Message content is validated and limited to 2,000 characters. Sender identity comes from the verified session, never from request input.
- Chat history and contact lists require authentication and validate the other participant's role.

## Install and run
From the project root:

```powershell
cd .\backend
npm install
npm run dev
```

In another terminal:

```powershell
cd .\frontend\src
npm install
npm run dev
```

Keep the existing private backend environment variables configured. `FRONTEND_URL` must match the Vite origin. The frontend socket URL is derived from `VITE_EXPRESS_API_URL` (default API: `http://127.0.0.1:5000/api`).

## API
All endpoints require a valid Bearer JWT:
- `GET /api/messages/contacts` — list the opposite role's chat contacts.
- `GET /api/messages/:userId` — retrieve the authenticated user's conversation with that contact.
- `POST /api/messages/:userId` — save and deliver a message; JSON body: `{"content":"Hello"}`.
- Existing `GET /api/notifications`, `POST /api/notifications` (admin), and `PATCH /api/notifications/:id/read` endpoints remain available.

## Socket events
- Server emits `notification:new` to the recipient's private user room.
- Server emits `message:new` to the sender and recipient's private user rooms.
- Socket authentication is supplied through `auth: { token }`; unauthenticated or expired sessions are rejected.

## Manual verification
1. Start MongoDB, backend, and frontend.
2. Sign in as an administrator in one browser session and a student in another.
3. As admin, create a notification with `POST /api/notifications` using the student's existing student identifier, a title, and a message. The student Notifications page should update while open.
4. Open Chat in both sessions. Select the contact and send a message. It should appear for both participants and remain in history after a page reload.
5. Mark a notification as read and reload the page to confirm the saved read state.
6. Sign out or use an expired token; protected API and socket connections must reject access.

Task 12 quiz-attempt and cooldown behavior is unchanged. No final-assessment attempt policy was changed.
