# Security policy

## Supported version

Security fixes are applied to the latest code on the `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential.

Use [GitHub's private vulnerability reporting](https://github.com/OLAOLEX/weldcheck/security/advisories/new) and include:

- the affected page, API route or file;
- steps to reproduce the problem;
- the likely impact;
- any safe mitigation you have identified.

Do not access records that are not yours, disrupt the production service or retain personal data while testing. A maintainer will acknowledge a complete report when it is reviewed and coordinate a fix before public disclosure.

If a live credential is exposed, revoke or rotate it immediately. Removing it from the latest commit is not enough because Git history may still contain it.
