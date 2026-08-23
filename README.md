# WeldCheck

[![MIT License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)
[![Validate](https://github.com/OLAOLEX/weldcheck/actions/workflows/validate.yml/badge.svg)](https://github.com/OLAOLEX/weldcheck/actions/workflows/validate.yml)

Cloud-backed SMAW job records, pre-welding checks, photograph-quality screening, visible weld-surface assessment, inspection history, reports, and evaluation exports for mild-steel samples.

Website: [weldcheck.cc](https://weldcheck.cc)

WeldCheck is an educational, visible-surface inspection and record-keeping project built with plain HTML, CSS and JavaScript. It is self-hostable and uses Supabase for private accounts/data and a server-side OpenAI endpoint for structured photograph assessment.

## Current workflow

1. Continue as a secure guest or link the guest account to Google.
2. Record the mild-steel joint, plate, electrode, welding position, and current.
3. Complete all nine SMAW preparation checks.
4. Upload a photograph; brightness, contrast, sharpness, resolution, and framing suitability are checked locally.
5. A suitable photograph is sent to the protected AI endpoint for a structured visible-surface assessment.
6. Review all visible conditions, observations, possible contributing factors, actions, and limitations.
7. Confirm/correct the result, optionally add a supervised reference assessment, and print the report.
8. Use the dashboard, download a spreadsheet or keep a full backup.

The in-app Help page and downloadable A4 PDF guide explain the same flow in plain language.

WeldCheck assesses visible surface appearance only. It does not determine internal weld condition, penetration, mechanical strength, or welding-code compliance.

## Local development

```bash
python3 dev-server.py
```

Open `http://localhost:4173`. Local drafts work without configuration. Cloud synchronization and AI inspection require the Vercel API routes or `vercel dev` with environment variables.

The upgraded app uses `weldcheck-db-v2`. The original `weldcheck-db` is not opened, migrated, or deleted.

For a full local cloud environment, copy `.env.example` to an ignored environment file and provide your own service configuration through `vercel dev`. Never commit real credentials.

## Supabase setup

1. Open the selected Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. In Authentication settings, enable **Anonymous Sign-Ins**.
4. Enable **Manual Identity Linking** so a guest can link Google without changing user ID.
5. Enable Google as an OAuth provider and configure its client ID/secret.
6. Set the Supabase Site URL to `https://weldcheck.cc`.
7. Add `https://weldcheck.cc/**`, the Vercel preview URL pattern, and the local development origin to the allowed redirect URLs.

The SQL creates:

- `jobs`, `inspections`, and private per-user RLS policies;
- a private `weld-images` bucket;
- an atomic `claim_ai_check` function and private usage table;
- indexes used by history and dashboard queries.

## Vercel environment variables

Configure these in the Vercel project. No project URL or key is hardcoded in the repository.

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
OPENAI_MODEL                 optional; defaults to gpt-4o-mini
AI_DAILY_LIMIT               optional shared override
SUPABASE_SERVICE_ROLE_KEY    server only; required for /admin
ADMIN_EMAILS                 comma-separated Google emails allowed to open /admin
```

Without `AI_DAILY_LIMIT`, the endpoint permits 5 AI checks per day for anonymous guests and 20 for Google-linked users. When the override is present, that value applies to both.

`SUPABASE_PUBLISHABLE_KEY` is returned to the browser by `/api/config`. Never use a Supabase secret/service-role key in that variable or browser code.

No WeldCheck production secret, user record or photograph is included in this repository. Forks must create and secure their own Supabase, OpenAI, Google OAuth and hosting configuration.

### Admin setup

The private `/admin` page uses normal Google sign-in, then verifies the account email on the server. Add `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` in Vercel, apply them to Production, Preview and Development as appropriate, then redeploy. Example:

```text
ADMIN_EMAILS=owner@example.com
```

The service-role key is used only inside `api/admin-overview.js`; it is never returned by `/api/config` or included in browser files. The first admin version is read-only and shows accounts, signups, recent activity, jobs, inspections and workflow progress. It does not collect physical location.

## Main structure

```text
index.html             Home, auth entry, totals, recent records
new-job.html           SMAW job fields
checklist.html         Nine preparation checks
upload.html            Photograph quality gate and inspection request
result.html            Full result, confirmation, reference, report, timeline
history.html           Dashboard, filters, CSV and JSON exports
guide.html             Plain-language help and downloadable PDF guide
admin.html             Read-only, Google-protected project administration
api/config.js          Public browser configuration
api/check-weld.js      Authenticated, rate-limited structured AI inspection
api/admin-overview.js  Allowlisted server-side admin overview
assets/cloud.js        Supabase auth/storage adapter
assets/data.js         Local-first jobs and inspections service
assets/db.js           Fresh IndexedDB v2 cache/drafts
supabase/schema.sql    Database, storage, RLS, and limit setup
```

## Inspection result model

The AI endpoint uses image input and a strict JSON Schema. It returns:

```text
status
confidence_level / confidence_reason
image_quality_status / image_quality_issues
summary
conditions[]
observations[]
assessment_reason
possible_causes[]
recommended_actions[]
limitations[]
response_time_ms
```

Allowed visible-condition codes are `visible_porosity`, `undercut`, `excessive_spatter`, and `irregular_bead`. One inspection may contain several codes. Every recheck creates a new inspection record.

## Contributing

Focused issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting. It includes the local checks and the privacy, accessibility and weld-safety boundaries that contributions must preserve.

Use the provided bug and feature forms. Do not post real inspection photographs, user data, API keys or security vulnerabilities in a public issue.

## Security

Report vulnerabilities privately through the repository Security tab as described in [SECURITY.md](SECURITY.md). GitHub secret scanning runs automatically for public repositories, but it is still each contributor's responsibility to keep credentials out of commits, issues and pull requests.

## License

WeldCheck is available under the [MIT License](LICENSE). The software is provided without warranty and does not replace qualified inspection or engineering testing.

Before changing repository visibility, work through the [open-source release checklist](docs/OPEN_SOURCE_RELEASE.md).
