# DemoGo CLI

DemoGo CLI lets AI coding tools publish a local project to DemoGo and return a shareable trial link.

## Local Install

Current MVP delivery uses a local install package.

1. Unzip `demogo-cli-v0.2.6.zip`.
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

Use without installing:

```bash
npx --yes @demogo-cn/cli deploy
```

Or use the installed command:

```bash
demogo deploy
```

For a specific folder or project name:

```bash
demogo deploy --dir <project-folder> --name <project-name>
```

## Current Boundary

DemoGo supports static pages, single HTML pages, built frontend output, and frontend source projects that can build static output. It does not host long-running backend services, databases, payment systems, login systems, WebSocket services, or SSR runtimes.

## npm / npx Status

AI coding tools can run:

```bash
npx --yes @demogo-cn/cli deploy
```

Or install it globally:

```bash
npm install -g @demogo-cn/cli
demogo deploy
```

The package name is `@demogo-cn/cli`; the installed command remains `demogo`.
If an AI coding tool cannot run `demogo` or `npx @demogo-cn/cli`, it should explain why and then use DemoGo MCP or the Agent API fallback.


