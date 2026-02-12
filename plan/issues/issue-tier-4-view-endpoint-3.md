TITLE:
Create test file test/routes/books.view.test.js with test setup for GET /books/:id

BODY:
## Context

Tier 4 introduces the `GET /books/:id` endpoint for retrieving a single book by UUID. Before writing individual test cases, we need the test file scaffolding: imports, a `beforeEach` hook that seeds a book into the database, and a shared constant for 404 tests.

This task creates `test/routes/books.view.test.js` with the foundational setup that all subsequent integration tests in this tier will build on. The seeded book is created via `POST /books` (the endpoint delivered in earlier tiers), ensuring the test exercises the real request pipeline. A known non-existent but valid UUID v4 (`'00000000-0000-4000-8000-000000000000'`) is defined once so 404 tests can reference it consistently.

## Acceptance Criteria

- [ ] File `test/routes/books.view.test.js` exists under the project root.
- [ ] The file imports `supertest` and the Express `app` from `../../src/app`.
- [ ] A `describe('GET /books/:id', ...)` block wraps all test setup.
- [ ] A `beforeEach` hook seeds a book by POSTing to `/books` with valid data (`title`, `author`, `isbn`, `published_year`) and stores the response body as `seededBook`.
- [ ] A constant for a non-existent valid UUID (`'00000000-0000-4000-8000-000000000000'`) is defined and available for 404 test cases.
- [ ] The file is syntactically valid and does not error when Jest loads it (even with zero test cases initially).
- [ ] All prior tier tests continue to pass.

## Implementation Notes

### File location

```
test/
└── routes/
    └── books.view.test.js
```

### Skeleton structure

```javascript
const request = require('supertest');
const app = require('../../src/app');

const NON_EXISTENT_UUID = '00000000-0000-4000-8000-000000000000';

describe('GET /books/:id', () => {
  let seededBook;

  beforeEach(async () => {
    const res = await request(app)
      .post('/books')
      .send({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-3-16-148410-0',
        published_year: 2023,
      });
    seededBook = res.body;
  });

  // Individual test cases will be added by subsequent tasks
});
```

### Key decisions

- **Seeding via HTTP** — Uses `POST /books` rather than a direct model call so the test exercises the full middleware/validation stack and mirrors how a consumer interacts with the API.
- **`beforeEach` (not `beforeAll`)** — Each test gets a fresh seed to avoid cross-test state leakage.
- **UUID constant** — `'00000000-0000-4000-8000-000000000000'` is a valid UUID v4 format that is astronomically unlikely to collide with a real record, making it safe for deterministic 404 assertions.

## Dependencies

- #143 — `GET /books/:id` handler logic must be implemented before these tests can execute successfully.

## References

- Tasks file: `plan\tasks\tasks-tier-4-view-endpoint.json`
- Tier document: `plan\tiers\tier-4-view-endpoint.md`
