import type { AgentToken } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { formatDate } from "../../utils/format";
import { createAgentInstruction } from "./utils";

export function AgentPublishPanel({
  token,
  onResetToken,
  onCopyInstruction,
  onCopyText
}: {
  token: AgentToken | null;
  onResetToken: () => void;
  onCopyInstruction: () => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const universalInstruction = createAgentInstruction(token);
  return (
    <section className="agent-publish-layout">
      <Card className="panel agent-publish-panel">
        <div className="panel-head">
          <div>
            <h2>复制一句话，让 AI 帮你发布到 DemoGo</h2>
            <p>适合你已经在 Codex、Cursor、Claude Code 等工具里做完项目，希望 AI 直接帮你生成试用链接。</p>
          </div>
          <Badge tone={token?.enabled ? "success" : "warning"}>{token?.enabled ? "口令已启用" : "未生成口令"}</Badge>
        </div>
        <div className="agent-user-guide">
          <strong>最简单的说法</strong>
          <p>"请把当前项目发布到 DemoGo，生成一个可以发给别人试用的链接。如果失败，请根据 DemoGo 的提示帮我修改后再试。"</p>
        </div>
        <div className="agent-user-guide agent-status-guide">
          <strong>你不用选择工具</strong>
          <p>把同一段提示词交给 Codex、Claude Code、Cursor 或其他 AI 工具即可。具体用哪种发布方式，由 AI 和 DemoGo 自动处理。</p>
        </div>
        <div className="agent-user-guide">
          <strong>工具接入状态</strong>
          <p>Codex 和 Claude Code 已进入插件化接入；Cursor、Windsurf、OpenHands 等工具优先通过 MCP 或 CLI 使用同一套发布规则。</p>
        </div>
        <div className="agent-user-guide">
          <strong>发布成功后怎么看</strong>
          <p>AI 会返回一个随机试用链接。你也可以回到"我的项目"查看项目名称、复制转发文案，Lite / Pro 用户还能在项目详情里修改链接后缀。</p>
        </div>
        <div className="agent-user-guide">
          <strong>更新已有链接</strong>
          <p>同一个项目目录再次发布时，CLI 会优先更新原链接；如果换了目录或电脑，请把原 DemoGo 链接发给 AI，并明确说"保持链接不变"。</p>
        </div>
        <div className="agent-user-guide">
          <strong>如果发布失败</strong>
          <p>先看 DemoGo 返回的原因：目录不对、文件太大、项目依赖后台功能、内容检查未通过或口令无效。让 AI 按提示修改后再重新发布，不要绕过检查。</p>
        </div>
        <div className="agent-steps">
          <div>
            <strong>1. 生成一次口令</strong>
            <span>只在首次配置、忘记或泄露时重置，不需要每次发布都生成。</span>
          </div>
          <div>
            <strong>2. 复制给 AI</strong>
            <span>把下方提示词交给 Codex、Cursor 或其他 AI 工具，AI 只需要把当前项目发出去。</span>
          </div>
          <div>
            <strong>3. 等待链接</strong>
            <span>首次发布会生成新链接；更新版本会保持原链接不变，只替换项目内容。</span>
          </div>
        </div>
        <div className="token-box">
          <span>当前口令</span>
          <strong>{token?.value || (token?.prefix ? `${token.prefix}...（完整口令已隐藏）` : "尚未生成")}</strong>
          {token?.createdAt ? <small>生成时间：{formatDate(token.createdAt)}；已配置的口令可长期复用。</small> : <small>首次生成后请立即保存，页面刷新后不再显示完整口令。</small>}
        </div>
        <div className="agent-command-box">
          <div className="copyable-head">
            <span>AI 发布提示词</span>
            <Button onClick={() => onCopyText(universalInstruction, "AI 发布提示词已复制。")} disabled={!universalInstruction}>复制</Button>
          </div>
          <pre>{universalInstruction || "请先生成一次 AI 发布口令。生成后复制这里的发布提示词。"}</pre>
        </div>
        <div className="row-actions">
          {!token?.enabled ? <Button variant="primary" onClick={onResetToken}>生成 AI 发布口令</Button> : null}
          <Button onClick={onCopyInstruction} disabled={!universalInstruction}>复制 AI 发布提示词</Button>
          {token?.enabled ? <Button variant="danger" onClick={onResetToken}>重置口令</Button> : null}
        </div>
      </Card>
      <Card className="panel agent-scope-panel">
        <h2>什么时候用这个入口</h2>
        <div className="support-scope-list">
          <div>
            <strong>网页上传</strong>
            <span>适合你自己上传压缩包，DemoGo 检查通过后生成链接。</span>
          </div>
          <div>
            <strong>AI 直接发布</strong>
            <span>适合让 Codex、Cursor、Claude Code 在项目目录里直接生成试用链接。</span>
          </div>
          <div>
            <strong>插件化发布</strong>
            <span>Codex 和 Claude Code 使用插件包；其他 AI 工具优先使用 MCP 或 CLI，仍然是同一条发布规则。</span>
          </div>
          <div>
            <strong>当前适合发布</strong>
            <span>普通网页、活动页、报名页、作品集、H5 页面、已经生成好的 dist/build/out 页面，以及能生成静态网页的前端源码项目。</span>
          </div>
          <div>
            <strong>暂不支持</strong>
            <span>多服务应用、Redis、MongoDB、PostgreSQL、真实支付、订单、用户登录系统、WebSocket、服务端渲染项目。</span>
          </div>
        </div>
      </Card>
    </section>
  );
}
