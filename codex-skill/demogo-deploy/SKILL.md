---
name: demogo-deploy
description: Publish AI-built static pages or frontend projects to DemoGo and return a shareable trial link. Use when the user asks Codex to deploy, publish, generate a DemoGo link, share a test link, or send an AI-built page/product/demo to DemoGo.
---

# DemoGo Deploy

Use this skill to publish the current project to DemoGo. DemoGo v0.2.5 is intended for AI-assisted publishing: the AI tool can package the current project, call DemoGo, and return a shareable trial link.

## What DemoGo Supports

DemoGo supports:

- Ready static pages with `index.html`.
- A single HTML page such as `landing-page.html` or `home.html`; DemoGo can publish it as the homepage.
- Built frontend output in `dist/`, `build/`, `out/`, or `public/`.
- Frontend source projects that can produce static pages after a build.
- Basic signup, booking, lead, feedback, or message forms that DemoGo can collect.
- `.zip`, `.tar.gz`, and `.tgz` packages.

DemoGo does not support:

- Long-running backend services.
- Express, FastAPI, Flask, Django, NestJS, or similar backend hosting.
- Next/Nuxt/Remix server runtime.
- Databases, payments, orders, login systems, WebSocket, or AI proxy backends.
- `.rar` packages.

Be direct with the user. Do not call unsupported backend hosting an experiment.

DemoGo reviews content before a public link is created. If the project contains scam-like promotions, gambling, pornography, illegal trading, malicious downloads, sensitive information collection, suspicious payment prompts, or unclear private-contact diversion, publishing will be blocked or require manual review. Explain this plainly to the user and fix the project before trying again.

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
3. If there is only one root HTML file such as `landing-page.html`, publish it directly; do not force the user to manually rename it.
4. Choose a meaningful project name from the page title, main heading, or HTML filename. Do not use generic names like `project`, `demo`, or `demogo`.
5. Do not include `.env`, secret files, `.git`, `node_modules`, logs, or huge generated folders.
6. Publish with the DemoGo CLI when it is installed or available:

```bash
demogo config set --api <DEMOGO_API_BASE> --token <DEMOGO_AGENT_TOKEN>
demogo doctor
demogo deploy
```

If `demogo` is not installed, explain that the local CLI is unavailable. Do not present `npx demogo` as the default unless the DemoGo CLI package has been formally published to npm. After npm publication, this form is acceptable:

```bash
npx demogo config set --api <DEMOGO_API_BASE> --token <DEMOGO_AGENT_TOKEN>
npx demogo doctor
npx demogo deploy
```

Do not use `demogo inspect`; it is not a supported CLI command in v0.2.5. Use `demogo doctor` only to check the platform address and local token configuration.

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

If the API fallback succeeds, say it was an API fallback. Do not describe it as a CLI deployment.

## Failure Handling

If DemoGo returns a project issue:

1. Explain the problem in user-friendly language.
2. Fix the project if possible.
3. Rebuild when needed.
4. Publish again.

If DemoGo says the account quota is insufficient, do not modify the project. Tell the user they need to remove an old trial link or upgrade.

If DemoGo returns a content review issue, do not try to bypass it. Remove or rewrite the risky content, rebuild the page, and publish again.

If DemoGo says the project uses unsupported backend/database/payment/login functionality, explain that DemoGo currently supports shareable static trial links and basic form collection only. Do not describe unsupported backend hosting as experimental.

## Final Response

Always return:

- Whether publishing succeeded.
- The DemoGo trial link.
- Whether form collection was detected or enabled, if provided by DemoGo.
- Any limitation the user should know before sharing the link.


