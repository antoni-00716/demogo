# DemoGo CLI

DemoGo CLI lets AI coding tools publish a local project to DemoGo and return a shareable trial link.

## Local Install

Current MVP delivery uses a local install package.

1. Unzip `demogo-cli-v0.2.5.zip`.
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

`npx demogo` works only after the CLI package is formally published to npm. Before that, use the local install package above. If an AI coding tool cannot run `demogo`, it should explain that the CLI is not installed and then use DemoGo MCP or the Agent API fallback.


