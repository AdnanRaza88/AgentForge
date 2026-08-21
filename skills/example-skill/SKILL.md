---
name: commit-message-style
description: Use when writing git commit messages, to follow Conventional Commits style
keywords: [commit, commit message, git commit]
---

# Commit Message Style

When writing a commit message, follow **Conventional Commits**:

```
<type>(<scope>): <short summary>

<body — why the change was made, not just what>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

- Keep the summary line under 72 characters.
- Use the imperative mood ("add", not "added").
- Reference an issue number when relevant, e.g. `(#123)`.
