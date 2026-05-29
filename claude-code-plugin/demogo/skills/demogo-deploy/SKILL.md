---
name: demogo-deploy
description: Publish or update the current project to DemoGo from Claude Code and return a shareable trial link. Use when the user asks to deploy, publish, create a DemoGo link, update a DemoGo link, or check DemoGo publishing readiness.
---

# DemoGo Deploy

Use this skill when the user wants to publish the current project to DemoGo. Keep the user path simple: the user should not need to choose CLI, MCP, API, or project type.

## Workflow

1. Run `demogo_doctor` first when DemoGo MCP is available.
2. Inspect the project folder with `demogo_check_project`.
3. If `.demogo/project.json` exists, update the existing DemoGo link by default.
4. If the user provides a DemoGo URL or Demo ID, update that link.
5. Otherwise create a new DemoGo trial link.
6. Return the final public link and any limitation the user should know.

## Preferred Tools

Prefer DemoGo MCP tools:

- `demogo_doctor`
- `demogo_check_project`
- `demogo_deploy_project`
- `demogo_update_project`
- `demogo_get_config`

If MCP is unavailable, use DemoGo CLI:

```bash
npx --yes @demogo-cn/cli deploy --api https://demogo.cn
```

For a known existing link:

```bash
npx --yes @demogo-cn/cli update --api https://demogo.cn --id <DemoGo URL or Demo ID>
```

Use Agent API only as a fallback and clearly say it was a fallback.

## Token

Use `DEMOGO_AGENT_TOKEN` when available. Ask for the DemoGo AI publish token only when missing or invalid. Do not ask the user to regenerate it for every deployment.

## User Burden Rule

Do not ask the user to:

- choose between CLI/MCP/API,
- rename one HTML file to `index.html`,
- decide whether the project is Vite, React, Node.js, or static,
- choose a link suffix during AI publishing,
- recreate a token for every publish.

DemoGo should handle automatic detection, packaging, publishing, updating, and diagnosis where possible.

## Boundaries

DemoGo supports static pages, frontend build output, frontend source projects that can build static output, Node.js single-service trial projects, MySQL trial databases, and user-owned Supabase configuration.

Do not claim support for Python, Java, Go, multi-service apps, Docker Compose projects, Redis, MongoDB, PostgreSQL auto-hosting, WebSocket, real payment systems, or production login systems.

## Failure Handling

Use DemoGo's returned diagnosis as the source of truth. Explain what failed, what evidence was found, and what should be changed next. Do not bypass content review.
