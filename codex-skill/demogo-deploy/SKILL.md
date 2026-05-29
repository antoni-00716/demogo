---
name: demogo-deploy
description: Publish AI-built static pages or frontend projects to DemoGo and return a shareable trial link. Use when the user asks Codex to deploy, publish, generate a DemoGo link, share a test link, or send an AI-built page/product/demo to DemoGo.
---

# DemoGo Deploy

Use this skill to publish or update the current project to DemoGo. DemoGo v0.5.2 can classify common frontend, backend, database, and environment-variable signals. It can publish static pages, frontend builds, enabled Node.js single-service runtime projects, and supported single-service Next.js/Nuxt/TanStack Start projects through the same CLI/API flow. When publishing fails, it can return structured failure diagnosis and a prompt that can be copied back to an AI coding tool for repair.

## What DemoGo Supports

DemoGo supports:

- Ready static pages with `index.html`.
- A single HTML page such as `landing-page.html` or `home.html`; DemoGo can publish it as the homepage.
- Built frontend output in `dist/`, `build/`, `out/`, or `public/`.
- Frontend source projects that can produce static pages after a build.
- Node.js single-service projects when the platform explicitly reports that runtime hosting is available.
- Basic signup, booking, lead, feedback, or message forms that DemoGo can collect.
- `.zip`, `.tar.gz`, and `.tgz` packages.

DemoGo v0.5.2 only treats runtime hosting as available when the platform response explicitly says the runtime is ready. Runtime projects must have a start command and listen on `process.env.PORT`. It can recognize common single-service Express, Koa, Fastify, Hono, and basic NestJS projects. It also supports eligible single-service Next.js, TanStack Start, and Nuxt projects. It recognizes SvelteKit, Astro, Supabase, Postgres, MySQL, Prisma, Drizzle, Sequelize, TypeORM, and `.env.example` signals for diagnosis. MySQL projects may receive a trial database through environment variables when the platform capability is enabled, and `schema.sql` can be used for initialization. DemoGo does not currently support:

- Python, Java, Go, FastAPI, Flask, Django, or similar backend hosting.
- Multi-service Node.js apps, Docker Compose, Redis, MongoDB, PostgreSQL, or WebSocket.
- Remix, SvelteKit, Astro, or other unsupported SSR server runtime.
- Redis, MongoDB, PostgreSQL, payments, orders, production login systems, WebSocket, or AI proxy backends.
- `.rar` packages.

Be direct with the user. Do not call unsupported backend hosting an experiment.

DemoGo reviews content before a public link is created. Normal marketing pages can collect names, phone numbers, emails, company names, booking requests, signups, consultation requests, and product trial leads. Publishing is blocked only for clearly high-risk content such as scams, gambling, pornography, illegal trading, malicious downloads, high-risk finance, or collection of highly sensitive data such as ID numbers, bank card numbers, verification codes, passwords, or face images. Explain this plainly to the user and fix the project before trying again.

## Required Inputs

Need a DemoGo AI publish token from the user or environment:

- Environment variable: `DEMOGO_AGENT_TOKEN`
- Or user-provided token from DemoGo workbench.

The token is reusable. Do not ask the user to reset it for every deployment. Ask for a new token only when no token is configured, the token is invalid, or the user explicitly wants to rotate it.

Need a DemoGo platform/API address:

- Prefer `DEMOGO_API_BASE` if set.
- Otherwise use the address provided by the user.
- If no address is provided, ask the user for the DemoGo platform URL.

## Preferred Workflow

1. Check the current project.
2. If it is source code, build it when a build command exists.
3. Confirm the publish directory is a clean project folder. Do not run publishing directly from Desktop, Downloads, Documents, OneDrive, or the user home folder.
4. If there is only one HTML file on Desktop/Downloads, create a clean temporary folder, put that HTML file there, and publish that folder. Do not force the user to manually rename it.
5. If there is only one root HTML file such as `landing-page.html`, publish it directly; do not force the user to manually rename it.
6. Choose a meaningful project name from the page title, main heading, or HTML filename. Do not use generic names like `project`, `demo`, or `demogo`.
7. Project names are for workbench display. Every first publish receives an automatically assigned trial link path. Do not ask the user to choose a link suffix during AI publishing.
8. If the user asks to update an existing DemoGo link, use update mode and keep the original link unchanged. If the current folder has already been published by DemoGo CLI, `demogo deploy` can update the original link automatically from `.demogo/project.json`. If there is no local record, ask the user for the original DemoGo link or Demo ID. Do not guess from project name or page title.
9. Lite and Pro users can later change the `/d/...` path in the DemoGo workbench. Pro users can apply for a `xxx.demogo.cn` subdomain in the workbench.
10. Do not include `.env`, secret files, `.git`, `node_modules`, logs, or huge generated folders.
11. Publish with the npm DemoGo CLI first. Use the single-command form by default:

```bash
npx --yes @demogo-cn/cli deploy --api <DEMOGO_API_BASE> --token <DEMOGO_AGENT_TOKEN>
```

For updating a known existing link from any folder, use:

```bash
npx --yes @demogo-cn/cli update --api <DEMOGO_API_BASE> --token <DEMOGO_AGENT_TOKEN> --id <DEMO_URL_OR_ID>
```

To force a new link even when the folder has a previous DemoGo record, use:

```bash
npx --yes @demogo-cn/cli deploy --api <DEMOGO_API_BASE> --token <DEMOGO_AGENT_TOKEN> --new
```

If npm/npx is unavailable but `demogo` is already installed locally, this form is acceptable:

```bash
demogo deploy --api <DEMOGO_API_BASE> --token <DEMOGO_AGENT_TOKEN>
```

The npm package name is `@demogo-cn/cli`; the installed command name remains `demogo`.

Do not use `demogo inspect`; it is not a supported CLI command in v0.5.2. Use `demogo doctor` only when you need to diagnose platform address or token configuration problems.

If the CLI is unavailable, use the MCP tool if configured, or call DemoGo Agent API directly. When falling back to the API, clearly say that this was an API fallback, not a successful CLI deployment.

## Direct API Fallback

Send a multipart request:

- URL: `<DEMOGO_API_BASE>/api/agent/deploy`
- Method: `POST`
- Header: `Authorization: Bearer <DEMOGO_AGENT_TOKEN>`
- Form fields:
  - `name`: project name
  - `source`: `agent_api` unless this is a CLI or MCP call
  - `project`: `.zip`, `.tar.gz`, or `.tgz` archive

Use `project` as the preferred archive field. DemoGo also accepts `file` and `package` for compatibility with AI tools, but new integrations should still use `project`.

For updating an existing link through API fallback:

- URL: `<DEMOGO_API_BASE>/api/agent/update`
- Method: `POST`
- Header: `Authorization: Bearer <DEMOGO_AGENT_TOKEN>`
- Form fields:
  - `demoId`: Demo ID, `/d/...` suffix, or full DemoGo URL
  - `source`: `agent_api` unless this is a CLI or MCP call
  - `project`: `.zip`, `.tar.gz`, or `.tgz` archive

If the API fallback succeeds, say it was an API fallback. Do not describe it as a CLI deployment.

## Failure Handling

If DemoGo returns a project issue:

1. Explain the problem in user-friendly language.
2. Fix the project if possible.
3. Rebuild when needed.
4. Publish again.

If DemoGo returns `diagnosis` or `failureDiagnosis`, use it as the primary source. Tell the user the category, the evidence, and the next action. If it includes `aiPrompt`, copy or summarize that prompt as the instruction for the AI coding tool to fix the project.

If DemoGo says the account quota is insufficient, do not modify the project. Tell the user they need to remove an old trial link or upgrade.

If DemoGo returns a content review issue, do not try to bypass it. Normal marketing forms can collect name, phone, email, company and consultation details, so do not remove those fields just because they are lead forms. Remove or rewrite only the risky content DemoGo reports, then rebuild and publish again.

If DemoGo says the project uses unsupported backend/database/payment/login functionality, explain that DemoGo currently supports shareable static trial links and basic form collection only. Do not describe unsupported backend hosting as experimental.

## Final Response

Always return:

- Whether publishing succeeded.
- The DemoGo trial link.
- Whether form collection was detected or enabled, if provided by DemoGo.
- Any limitation the user should know before sharing the link.


