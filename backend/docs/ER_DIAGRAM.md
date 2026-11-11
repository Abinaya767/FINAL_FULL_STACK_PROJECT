# LearnSpace collection relationships — Task 11

```mermaid
erDiagram
    USER ||--o| STUDENT : profile
    STUDENT ||--o{ ENROLLMENT : enrolls
    COURSE ||--o{ ENROLLMENT : contains
    COURSE ||--|{ MODULE : orders
    MODULE ||--o{ LESSON : contains
    MODULE ||--o| QUIZ : assessed_by
    STUDENT ||--o{ PROGRESS : tracks
    COURSE ||--o{ PROGRESS : tracks
    MODULE ||--o{ PROGRESS : measures
    PROGRESS ||--o{ QUIZ_ATTEMPT : history
    STUDENT ||--o{ QUIZ_ATTEMPT : makes
    COURSE ||--o{ QUIZ_ATTEMPT : for
    MODULE ||--o{ QUIZ_ATTEMPT : assesses
    QUIZ ||--o{ QUIZ_ATTEMPT : records
    COURSE ||--o| ASSESSMENT : final_assessment
    ENROLLMENT ||--o{ ASSESSMENT_ATTEMPT : history
    STUDENT ||--o{ ASSESSMENT_ATTEMPT : makes
    COURSE ||--o{ ASSESSMENT_ATTEMPT : for
    ASSESSMENT ||--o{ ASSESSMENT_ATTEMPT : assesses
    STUDENT ||--o{ CERTIFICATE : earns
    COURSE ||--o{ CERTIFICATE : awards
    STUDENT ||--o{ NOTIFICATION : receives
```

`Student.enrollments` references Enrollment documents, and `Course.modules` / `Module.lessons` reference ordered curriculum documents. `Module.quiz` and `Quiz.module` represent the one-to-one module quiz relationship. Progress retains only the current, maximum-two-attempt window; each accepted quiz submission is also stored as a separate `QuizAttempt` document. Unlimited final-assessment history is stored in separate `AssessmentAttempt` documents rather than embedded in Enrollment. Reference synchronization and ownership validation are Task 12 service responsibilities.

Every course must contain at least 10 modules. This minimum is validated by the Course schema; the diagram's `COURSE ||--|{ MODULE` relationship also represents the required one-or-more association.
