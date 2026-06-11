import os

path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"

content = """import { useState } from "react";
import type { AgentToken } from "../../types";
import { Button } from "../../components/Button";
import { Sparkles, Copy, Key, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { createAgentInstruction } from "./utils";

export function AgentPublishPanel({
  token,
  onResetToken,
  onCopyInstruction,
}: {
  token: AgentToken | null;
  onResetToken: () => void;
  onCopyInstruction: () => void;
}) {
  const hasToken = token?.enabled;
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const instructionText = hasToken ? createAgentInstruction(token) : "";
  const tokenValue = token?.value || "";

  async function handleCopyToken() {
    try {
      await navigator.clipboard.writeText(tokenValue);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="workspace-home">
      <div className="ws-welcome" style={{ marginBottom: 24 }}>
        <h1 className="ws-greeting">AI 发布</h1>
        {hasToken && (
          <p className="ws-section-desc">把下面这段指令复制给你的 AI 编程工具，它就能帮你把项目发布到 DemoGo</p>
        )}
      </div>

      {!hasToken ? (
        <div className="agent-onboarding">
          <div className="agent-onboarding-icon">
            <Key size={32} />
          </div>
          <h2>首次使用，需要生成口令</h2>
          <p>口令是 AI 工具连接 DemoGo 的凭证，生成一次就好，之后每次发布都不需要重复操作</p>
          <Button variant="primary" onClick={onResetToken}>
            <Sparkles size={16} /> 生成口令
          </Button>
        </div>
      ) : (
        <>
          <div className="agent-token-card">
            <div className="agent-token-label">
              <Key size={16} />
              <span>你的发布口令</span>
            </div>
            <div className="agent-token-row">
              <code className="agent-token-value">
                {showToken ? tokenValue : token?.prefix ? token.prefix + "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              </code>
              <button
                className="agent-token-toggle"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "隐藏口令" : "显示口令"}
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <Button variant="ghost" onClick={handleCopyToken} style={{ padding: "4px 10px", fontSize: 13 }}>
                {copiedToken ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                <span style={{ marginLeft: 4 }}>{copiedToken ? "已复制" : "复制"}</span>
              </Button>
            </div>
          </div>

          <div className="agent-instruction-card">
            <div className="agent-instruction-header">
              <span>完整指令</span>
              <span className="agent-instruction-hint">下面这段文字就是复制给 AI 的完整内容</span>
            </div>
            <pre className="agent-instruction-body">{instructionText}</pre>
            <div className="agent-instruction-action">
              <Button variant="primary" onClick={onCopyInstruction}>
                <Copy size={16} /> 复制完整指令给 AI
              </Button>
            </div>
          </div>

          <div className="agent-tools-bar">
            <span>支持 Cursor</span>
            <span>·</span>
            <span>Windsurf</span>
            <span>·</span>
            <span>Codex</span>
            <span>·</span>
            <span>Claude Code</span>
          </div>

          <div className="agent-steps">
            <div className="agent-step-card">
              <div className="agent-step-num">{'\u2777'}</div>
              <strong>AI 自动发布</strong>
              <p>AI 收到后会调用 DemoGo，自动帮你上传和部署</p>
            </div>
            <div className="agent-step-card">
              <div className="agent-step-num">{'\u2778'}</div>
              <strong>链接到手</strong>
              <p>发布成功后会返回一个链接，在"我的作品"里也能看到</p>
            </div>
          </div>

          <div className="agent-token-bar">
            <CheckCircle2 size={14} />
            <span>口令已启用</span>
            <span className="agent-token-bar-hint">口令是 AI 连接 DemoGo 的凭证，请不要泄露给不信任的第三方</span>
            <Button onClick={onResetToken} variant="ghost" style={{ marginLeft: "auto" }}>
              重新生成
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("AgentPublishPanel.tsx written successfully")
