# Open-source release checklist

Use this checklist immediately before changing the GitHub repository visibility to Public.

## Repository

- [ ] Review the MIT License and confirm it is the license you want.
- [ ] Confirm the repository description and website are correct.
- [ ] Add useful topics such as `welding`, `smaw`, `inspection`, `supabase`, `openai` and `vanilla-javascript`.
- [ ] Confirm Issues and private vulnerability reporting are enabled.
- [ ] Enable branch protection or a ruleset for `main` and require the Validate workflow.
- [ ] Enable secret scanning and push protection where GitHub offers them.
- [ ] Review the Security tab after the repository becomes public.

## Secrets and services

- [ ] Confirm no `.env` file is tracked.
- [ ] Confirm Vercel variables use the correct Production/Preview/Development scope.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server-only.
- [ ] Rotate any credential that was ever pasted into a commit, issue or pull request.
- [ ] Confirm Supabase RLS is enabled for jobs, inspections and image storage.
- [ ] Confirm the admin allowlist contains only intended Google accounts.

## Public website

- [ ] Confirm `weldcheck.cc` is the primary Vercel domain.
- [ ] Confirm `www.weldcheck.cc` redirects to the primary domain.
- [ ] Set the Supabase Site URL to `https://weldcheck.cc` and allow `https://weldcheck.cc/**`.
- [ ] Add the corresponding Google OAuth authorized origin and Supabase callback URL.
- [ ] Test guest mode, Google linking, photo quality, AI inspection, history, report and admin access.

Making the repository public is intentionally not automated by this checklist.
