# Update DemoGo Link

Update an existing DemoGo trial link with the current project files. Keep the original link unchanged.

Use DemoGo MCP first:

1. `demogo_doctor`
2. `demogo_check_project`
3. `demogo_update_project`

If MCP is unavailable, use:

```bash
npx --yes @demogo-cn/cli update --api https://demogo.cn --id <DemoGo URL or Demo ID>
```

If there is no `.demogo/project.json` and the user has not provided an existing DemoGo URL or Demo ID, ask for the original link before updating. Do not guess from the project name.
