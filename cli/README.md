# DemoGo CLI

DemoGo CLI lets AI coding tools publish a local project to DemoGo and return a shareable trial link.

## Local Install

Current MVP delivery uses a local install package.

1. Unzip `demogo-cli-v0.9.0.zip`.
2. Open a terminal in the extracted folder.
3. Run:

```bash
npm install -g .
```

4. Verify:

```bash
demogo --version
```

## Configure

```bash
demogo config set --api https://demogo.cn --token <DemoGo AI publish token>
demogo doctor
```

The token is reusable. Do not reset it for every deployment.
Reset it only when it is lost, invalid, or exposed in chat/logs.

## Deploy

Run the command from a clean project folder. Do not run it directly from Desktop, Downloads, Documents, or the user home folder.

Use without installing:

```bash
npx --yes @demogo-cn/cli deploy --api https://demogo.cn --token <DemoGo AI publish token>
```

Or use the installed command:

```bash
demogo deploy
```

For a specific folder or project name:

```bash
demogo deploy --dir <project-folder> --name <project-name>
```

After a successful first publish, the CLI stores a small local record in `.demogo/project.json`. If the same project folder is published again with `demogo deploy`, DemoGo updates the original trial link by default. This does not consume a new Demo slot, but it does consume one publish/update count.

To force a brand-new trial link from the same folder:

```bash
demogo deploy --new
```

To update an existing link from another folder or another machine:

```bash
demogo update --id https://demogo.cn/d/try-xxxxxx/
```

If you only have one HTML file, put that file in a clean folder and publish that folder. You do not need to rename the file to `index.html`.

Project names are used for display in the DemoGo workbench. Every first publish receives an automatically assigned trial link path. Lite and Pro users can later customize the `/d/...` path in the workbench. Pro users can apply for a `xxx.demogo.cn` subdomain.

## Current Boundary

DemoGo supports static pages, single HTML pages, built frontend output, frontend source projects that can build static output, and Node.js single-service trial projects when the platform reports that the Node runtime is available. Node.js projects must provide a start command and listen on `process.env.PORT`.

DemoGo can classify common frontend, backend, database, and environment-variable signals, including Next.js, TanStack Start, Nuxt, SvelteKit, Astro, Express, Fastify, Hono, Supabase, Postgres, MySQL, Prisma, and Drizzle.

DemoGo can allocate an empty MySQL trial database for supported Node.js single-service projects. Eligible single-service Next.js, Nuxt, and TanStack Start projects may run through the Node.js runtime when the platform capability is available. DemoGo does not currently run Redis, MongoDB, PostgreSQL, multi-service apps, WebSocket, or unsupported SSR runtimes such as Remix, SvelteKit, and Astro server mode.

When publishing or updating fails, DemoGo returns structured failure diagnosis when available. The diagnosis includes the failure category, visible evidence, recommended user actions, and a prompt that can be copied back to an AI coding tool for repair.

## npm / npx Status

AI coding tools can run:

```bash
npx --yes @demogo-cn/cli deploy --api https://demogo.cn --token <DemoGo AI publish token>
```

Or install it globally:

```bash
npm install -g @demogo-cn/cli
demogo deploy
```

The package name is `@demogo-cn/cli`; the installed command remains `demogo`.
If an AI coding tool cannot run `demogo` or `npx @demogo-cn/cli`, it should explain why and then use DemoGo MCP or the Agent API fallback.




