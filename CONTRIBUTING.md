# Contributing to WeldCheck

Thanks for helping improve WeldCheck. Small, focused changes are easiest to review.

## Before you start

- Search existing issues before opening a new one.
- Use an issue for significant features or behavior changes before writing a large patch.
- Never include real weld records, user information, photographs, credentials or API keys in an issue or pull request.
- Keep the application framework-free unless a redesign has first been agreed.

## Local setup

1. Fork and clone the repository.
2. Start the static development server:

   ```bash
   python3 dev-server.py
   ```

3. Open `http://localhost:4173`.

Local drafts and the generated test samples work without cloud credentials. For the complete cloud flow, copy `.env.example` to a local environment file and supply your own Supabase and OpenAI configuration through Vercel or `vercel dev`. Never commit that file.

## Project rules

- Use plain HTML, CSS and JavaScript.
- Keep user-facing language short and understandable.
- Preserve accessible labels, keyboard focus and responsive behavior.
- Browser analysis may reject poor photographs but must not classify weld conditions.
- AI explanations must describe visible evidence only.
- Never claim weld certification, code compliance, penetration, internal condition, structural strength or confirmed process causes from a photograph.
- Keep OpenAI and Supabase secret or service-role keys server-side.
- Preserve Supabase Row Level Security and private image storage.

## Checks

Before opening a pull request:

```bash
for file in api/*.js assets/*.js; do node --check "$file"; done
python3 -m py_compile dev-server.py
git diff --check
```

Also test the affected flow at desktop and mobile widths. If result or report content changes, verify the printed A4 layout.

## Pull requests

- Explain the problem and the change.
- Link the related issue when one exists.
- Include screenshots for visible UI changes.
- State what you tested.
- Keep unrelated formatting or refactoring out of the pull request.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
