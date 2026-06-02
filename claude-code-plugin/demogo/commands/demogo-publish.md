# Publish to DemoGo

Publish the current project to DemoGo and return the shareable trial link.

Use DemoGo MCP first:

1. `demogo_doctor`
2. `demogo_check_project`
3. `demogo_deploy_project` or `demogo_update_project`

If MCP is unavailable, use:

```bash
npx --yes @demogo-cn/cli deploy --api https://demogo.cn
```

If the project already has `.demogo/project.json`, update the existing link. If the user gives a DemoGo URL or Demo ID, update that link. Otherwise create a new link.

Keep the user-facing result short: publish status, DemoGo link, and any limitation before sharing.
