---
name: writing-tests
description: Write and improve unit/integration tests. Use when adding features, fixing bugs, or the user asks for test coverage.
---

# Writing tests

- Prefer the project's existing test runner (detect from package.json / pytest.ini).
- Red → green: write a failing test that captures the bug/feature, then implement.
- Name tests by behavior, not implementation (`it("rejects expired tokens")`).
- Cover the boundary the bug lived on; don't only retest the happy path.
- Keep fixtures minimal; avoid over-mocking what should be integration-tested.
- After changes, run the real suite and report pass/fail delta vs baseline.
