import os

path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"

content = r"""import { useState } from "react";
import type { AgentToken } from "../../types";
import { Button } from "../../components/Button";
import { Sparkles, Copy, Key, CheckCircle2, Eye, EyeOff, Upload, RefreshCw, Wand2 } from "lucide-react";
import { createAgentInstruction } from "./utils";

export function AgentPublishPanel({
  token,
  onResetToken,
}: {
  token: AgentToken | null;
  onResetToken: () => void;
}) {
  const hasToken = token?.enabled;
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [publishMode, setPublishMode] = useState<"new" | "update">("new");
  const [updateUrl, setUpdateUrl] = useState("");
  const [generatedInstruction, setGeneratedInstruction] = useState("");
  const [copiedInstruction, setCopiedInstruction] = useState(false);

  const tokenValue = token?.value || "";

  function handleGenerate() {
    const text = createAgentInstruction(token, {
      mode: publishMode,
      updateUrl: publishMode === "update" ? updateUrl : undefined,
    });
    setGeneratedInstruction(text);
    setCopiedInstruction(false);
  }

  async function handleCopyToken() {
    try {
      await navigator.clipboard.writeText(tokenValue);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {}
  }

  async function handleCopyInstruction() {
    try {
      await navigator.clipboard.writeText(generatedInstruction);
      setCopiedInstruction(true);
      setTimeout(() => setCopiedInstruction(false), 2000);
    } catch {}
  }

  // ===== No token =====
  if (!hasToken) {
    return (
      <div className="workspace-home">
        <div className="ws-welcome" style={{ marginBottom: 24 }}>
          <h1 className="ws-greeting">AI 发布</h1>
          <p className="ws-section-desc">生成一个发布口令，然后 AI 就能帮你把项目发到 DemoGo</p>
        </div>
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
      </div>
    );
  }

  const canGenerate = publishMode === "new" || (publishMode === "update" && updateUrl.trim());

  return (
    <div className="workspace-home">
      <div className="ws-welcome" style={{ marginBottom: 24 }}>
        <h1 className="ws-greeting">AI 发布</h1>
        <p className="ws-section-desc">复制一句指令给你的 AI 编程工具，它就能帮你把项目发布到 DemoGo</p>
      </div>

      {/* 口令卡片 */}
      <div className="agent-token-card">
        <div className="agent-token-label">
          <Key size={16} />
          <span>你的发布口令</span>
          <span className="agent-token-hint">AI 就是靠这个口令连接到你的 DemoGo 账号</span>
        </div>
        <div className="agent-token-row">
          <code className="agent-token-value">
            {showToken
              ? tokenValue
              : token?.prefix
                ? token.prefix + "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
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
          <div className="agent-token-divider" />
          <Button onClick={onResetToken} variant="ghost" style={{ padding: "4px 12px", fontSize: 13, color: "var(--text-tertiary)" }}>
            重新生成
          </Button>
        </div>
      </div>

      {/* 发布方式选择 */}
      <div className="agent-section-label">选择发布方式</div>
      <div className="agent-mode-selector">
        <button
          className={`agent-mode-btn ${publishMode === "new" ? "active" : ""}`}
          onClick={() => { setPublishMode("new"); setGeneratedInstruction(""); }}
        >
          <Upload size={18} />
          <span>发布新项目</span>
          <span className="agent-mode-desc">把项目首次发到 DemoGo，获得一个试用链接</span>
        </button>
        <button
          className={`agent-mode-btn ${publishMode === "update" ? "active" : ""}`}
          onClick={() => { setPublishMode("update"); setGeneratedInstruction(""); }}
        >
          <RefreshCw size={18} />
          <span>更新已有项目</span>
          <span className="agent-mode-desc">项目改好了，更新到之前发布的链接</span>
        </button>
      </div>

      {/* 原链接输入（仅更新模式） */}
      {publishMode === "update" && (
        <div className="agent-update-url">
          <input
            type="text"
            placeholder="粘贴你之前发布过的 DemoGo 链接，例如 https://demogo.cn/d/abc123"
            value={updateUrl}
            onChange={(e) => { setUpdateUrl(e.target.value); setGeneratedInstruction(""); }}
          />
        </div>
      )}

      {/* 生成按钮 */}
      <div className="agent-generate-area">
        <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate}>
          <Wand2 size={16} /> 生成发布指令
        </Button>
        {!canGenerate && publishMode === "update" && (
          <span className="agent-generate-hint">请先填写原项目链接</span>
        )}
      </div>

      {/* 生成结果 */}
      {generatedInstruction && (
        <div className="agent-instruction-card" style={{ marginTop: 20 }}>
          <div className="agent-instruction-header">
            <span>发布指令</span>
            <span className="agent-instruction-hint">把这段话复制给你的 AI 工具，它就知道该怎么做了</span>
          </div>
          <pre className="agent-instruction-body">{generatedInstruction}</pre>
          <div className="agent-instruction-action">
            <Button variant="primary" onClick={handleCopyInstruction}>
              {copiedInstruction ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copiedInstruction ? " 已复制" : " 复制给 AI"}
            </Button>
          </div>
        </div>
      )}

      {/* 支持的工具 */}
      <div className="agent-tools-bar">
        <span>支持 Cursor</span>
        <span>·</span>
        <span>Windsurf</span>
        <span>·</span>
        <span>Codex</span>
        <span>·</span>
        <span>Claude Code</span>
      </div>
    </div>
  );
}
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("AgentPublishPanel.tsx written")
