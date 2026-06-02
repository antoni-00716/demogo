---
name: demogo-deploy
description: Publish or update the current project to DemoGo from Codex and return a shareable trial link. Use when the user asks to deploy, publish, generate a DemoGo link, update a DemoGo link, or check whether a project can be published.
---

# DemoGo Deploy

Use this skill when the user wants the current project to become a DemoGo trial link. Keep the user experience simple: the user should not need to choose between Codex, Claude Code, Cursor, CLI, MCP, or API paths.

## Default Workflow

1. Inspect the current project folder.
2. Do not publish directly from Desktop, Downloads, Documents, OneDrive, or the user home folder.
3. If the project is already linked to DemoGo through `.demogo/project.json`, update the existing link by default.
4. If the user provides an existing DemoGo link or Demo ID, update that link.
5. Otherwise, create a new trial link.
6. Return the DemoGo link and any important limitation.

## Preferred Execution

Prefer the DemoGo MCP tools when available:

- `demogo_check_project`
- `demogo_deploy_project`
- `demogo_update_project`
- `demogo_doctor`
- `demogo_get_config`

If MCP is not available, use the npm CLI:

```bash
npx --yes @demogo-cn/cli deploy --api https://demogo.cn
```

For a known existing link:

```bash
npx --yes @demogo-cn/cli update --api https://demogo.cn --id <DemoGo URL or Demo ID>
```

If neither MCP nor CLI is available, explain the blocker. Use Agent API only as a fallback and say clearly that it was an API fallback.

## Token Handling

Use `DEMOGO_AGENT_TOKEN` when available. If there is no token, ask the user for the DemoGo AI publish token from the DemoGo workbench. Do not ask the user to reset the token unless it is missing, invalid, or exposed.

## User Burden Rule

Do not ask the user to decide technical details that DemoGo or Codex can infer. In particular:

- Do not ask the user to rename a single HTML file to `index.html`.
- Do not ask the user to choose a link suffix during AI publishing.
- Do not ask the user to decide whether the project is Vite, React, Node.js, or static before inspection.
- Do not ask the user to choose CLI vs MCP vs API.
- Do not ask the user to recreate a token for every publish.

## Boundaries

DemoGo currently supports static pages, frontend build output, frontend source projects that can build static output, Node.js single-service trial projects, MySQL trial databases, and user-owned Supabase configuration.

Do not claim support for Python, Java, Go, multi-service apps, Docker Compose projects, Redis, MongoDB, PostgreSQL auto-hosting, WebSocket, real payment systems, or production login systems.

## Failure Handling

If DemoGo returns `diagnosis` or `failureDiagnosis`, use it as the source of truth. Tell the user:

- what failed,
- what evidence DemoGo found,
- what you changed or what should be changed next,
- whether another publish attempt was made.

Do not bypass content review. Normal marketing, signup, booking, consultation, lead, name, phone, email, company, and message forms are allowed. Block or rewrite only clearly risky content such as scams, gambling, pornography, illegal trading, malicious downloads, high-risk finance, or highly sensitive data collection.
