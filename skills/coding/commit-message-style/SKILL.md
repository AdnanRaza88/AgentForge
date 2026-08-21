---
name: commit-message-style
description: Write clear commit messages and PR descriptions. Use when committing, opening PRs, or summarizing a change set.
---

# Commit messages

- Subject: imperative, ≤72 chars, no trailing period (`fix auth token refresh`).
- Body: why, not only what. Mention risk / migration if any.
- One logical change per commit when practical.
- Never commit secrets, `.env`, or generated noise unless project convention requires it.
- PR description: what failed before, what's still open, decisions made without asking.
