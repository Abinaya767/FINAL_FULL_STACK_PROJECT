# LearnSpace — Planned Technology Stack

| Layer | Technology | Intended use |
|---|---|---|
| Structure | HTML5 | Semantic page structure |
| Styling | CSS3 | Responsive interface |
| Language | JavaScript | Frontend and backend application logic |
| Frontend | React + Vite | Component-based web application and development server |
| Routing | React Router | Client-side navigation and protected route structure |
| HTTP | Axios | Frontend API communication |
| Backend | Node.js + Express.js | REST API and server-side business rules |
| API | REST under `/api/v1` | Versioned application endpoints |
| Database | MongoDB + Mongoose | Persistent records and schema validation |
| Authentication | JWT + bcryptjs | Token verification and password hashing |
| Real time | Socket.IO | Authenticated messaging and notifications |
| Tools | Git/GitHub, VS Code, Postman, MongoDB Compass, npm | Version control, development, API testing, database inspection |

## Configuration principles
- Store secrets in environment variables.
- Commit `.env.example` files only when actual environment configuration is introduced.
- Never commit real credentials.
- Keep frontend and backend source code separate.
