# Check DemoGo

Check whether DemoGo publishing is ready in the current Claude Code environment.

Use DemoGo MCP first:

```text
demogo_doctor
```

Report:

- whether the DemoGo platform is reachable,
- platform version,
- whether the AI publish token is configured and valid,
- the next action if anything is missing.

If MCP is unavailable, run:

```bash
npx --yes @demogo-cn/cli doctor --api https://demogo.cn
```
