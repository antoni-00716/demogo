import re

path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\utils.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the function and replace it entirely
# Match from "export function createAgentInstruction" to the closing "}"
pattern = r'(export function createAgentInstruction\(token: AgentToken \| null\) \{.*?\n\})'
match = re.search(pattern, content, re.DOTALL)
if match:
    old_block = match.group(1)
    new_block = '''export function createAgentInstruction(
  token: AgentToken | null,
  opts?: { mode?: "new" | "update"; updateUrl?: string }
) {
  if (!token?.enabled) return "";
  const value = token?.value || "";
  const apiBase = getDemoGoApiBase();
  const mode = opts?.mode || "new";
  const updateUrl = opts?.updateUrl || "";

  if (mode === "update" && updateUrl) {
    return [
      "请把当前项目的更新发布到 DemoGo 原链接，并把最终链接告诉我。",
      "",
      `DemoGo 平台地址：${apiBase}`,
      value ? `DemoGo AI 发布口令：${value}` : "DemoGo AI 发布口令：使用你已经保存好的 DEMOGO_AGENT_TOKEN，不要要求用户重新生成口令。",
      `需要更新的原链接：${updateUrl}`,
      "",
      "请使用以下命令更新已有链接（不要新建成一个链接）：",
      value
        ? `   npx --yes @demogo-cn/cli update --api ${apiBase} --token 上面的AI发布口令 --id ${updateUrl}`
        : `   npx --yes @demogo-cn/cli update --api ${apiBase} --token 已保存的AI发布口令 --id ${updateUrl}`,
      "",
      "操作要求：",
      "1. 更新前检查项目结构，不要上传 node_modules、.git、.env、日志文件、密钥文件和无关大文件。",
      "2. 不要要求我手动改文件名或判断技术栈；能自动处理的请自动处理。",
      "3. 只能更新原链接，禁止创建新链接。",
      "4. 如果 CLI 不可用，再尝试 DemoGo MCP 或 Agent API 兜底，并明确说明使用了兜底方式。",
      "5. 如果发布失败，请根据 DemoGo 返回的失败诊断修复项目；无法修复时，请告诉我失败原因和下一步怎么改。",
      "6. 更新成功后，只需要返回原 DemoGo 试用链接和需要我注意的限制。"
    ].join("\\n");
  }

  return [
    "请把当前项目发布到 DemoGo，生成一个可以分享给用户试用的链接，并把最终链接告诉我。",
    "",
    `DemoGo 平台地址：${apiBase}`,
    value ? `DemoGo AI 发布口令：${value}` : "DemoGo AI 发布口令：使用你已经保存好的 DEMOGO_AGENT_TOKEN，不要要求用户重新生成口令。",
    "",
    "请优先使用 DemoGo CLI：",
    value
      ? `   npx --yes @demogo-cn/cli deploy --api ${apiBase} --token 上面的AI发布口令`
      : `   npx --yes @demogo-cn/cli deploy --api ${apiBase} --token 已保存的AI发布口令`,
    "",
    "操作要求：",
    "1. 发布前检查项目结构，不要上传 node_modules、.git、.env、日志文件、密钥文件和无关大文件。",
    "2. 不要要求我手动改文件名或判断技术栈；能自动处理的请自动处理。",
    "3. 首次发布由 DemoGo 自动生成随机试用链接，不要让我选择链接后缀。",
    "4. 如果 CLI 不可用，再尝试 DemoGo MCP 或 Agent API 兜底，并明确说明使用了兜底方式。",
    "5. 如果发布失败，请根据 DemoGo 返回的失败诊断修复项目；无法修复时，请告诉我失败原因和下一步怎么改。",
    "6. 发布成功后，只需要返回 DemoGo 试用链接和需要我注意的限制。"
  ].join("\\n");
}
'''
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("utils.ts updated successfully")
else:
    print("Pattern not matched")
    idx = content.find("export function createAgentInstruction")
    if idx >= 0:
        end = content.find("\n}", idx)
        print("Sample:", repr(content[idx:end+5]))
