path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"

content = r"""import { useState } from "react";
import type { AgentToken } from "../../types";
import { Button } from "../../components/Button";
import { Sparkles, Copy, Key, CheckCircle2, Eye, EyeOff, Upload, RefreshCw, Wand2, Circle, ChevronRight } from "lucide-react";
import { createAgentInstruction } from "./utils";

type StepStatus = "pending" | "active" | "completed";

function StepIndicator({ step, status }: { step: number; status: StepStatus }) {
  if (status === "completed") {
    return (
      <div className="agent-step-dot completed">
        <CheckCircle2 size={20} />
      </div>
    );
  }
  return (
    <div className={`agent-step-dot ${status}`}>
      {step}
    </div>
  );
}

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

  // Determine step statuses
  const step1Status: StepStatus = hasToken ? "completed" : "active";
  const step2Status: StepStatus = !hasToken ? "pending" : hasToken ? "active" : "pending";
  const step3Status: StepStatus = !hasToken ? "pending" : generatedInstruction ? "completed" : "active";

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

  const canGenerate = publishMode === "new" || (publishMode === "update" && updateUrl.trim());

  return (
    <div className="workspace-home">
      {/* ═══ Step 1: 生成口令 ═══ */}
      <div className={`agent-step-block ${step1Status}`}>
        <div className="agent-step-head">
          <StepIndicator step={1} status={step1Status} />
          <div className="agent-step-title-wrap">
            <span className="agent-step-title">生成发布口令</span>
            <span className="agent-step-desc">
              {hasToken
                ? "口令已生成，AI 就是靠它连接到你的 DemoGo 账号"
                : "首次使用需要先生成一个口令，之后每次发布都不需要重复操作"}
            </span>
          </div>
        </div>
        {hasToken && (
          <div className="agent-step-body">
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
              <button className="agent-token-regenerate" onClick={onResetToken}>
                重新生成
              </button>
            </div>
          </div>
        )}
        {!hasToken && (
          <div className="agent-step-body">
            <Button variant="primary" onClick={onResetToken}>
              <Sparkles size={16} /> 生成口令
            </Button>
          </div>
        )}
      </div>

      {/* Step connector arrow */}
      <div className="agent-step-connector">
        <ChevronRight size={16} />
      </div>

      {/* ═══ Step 2: 选择发布方式 ═══ */}
      <div className={`agent-step-block ${step2Status}`}>
        <div className="agent-step-head">
          <StepIndicator step={2} status={step2Status} />
          <div className="agent-step-title-wrap">
            <span className="agent-step-title">选择发布方式</span>
            <span className="agent-step-desc">
              {!hasToken
                ? "请先完成第 1 步"
                : "选新项目发布还是更新已有项目"}
            </span>
          </div>
        </div>
        {hasToken && (
          <div className="agent-step-body">
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
            {publishMode === "update" && (
              <div className="agent-update-url" style={{ marginTop: 16, marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="粘贴你之前发布过的 DemoGo 链接，例如 https://demogo.cn/d/abc123"
                  value={updateUrl}
                  onChange={(e) => { setUpdateUrl(e.target.value); setGeneratedInstruction(""); }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step connector arrow */}
      <div className="agent-step-connector">
        <ChevronRight size={16} />
      </div>

      {/* ═══ Step 3: 生成并复制指令 ═══ */}
      <div className={`agent-step-block ${step3Status}`}>
        <div className="agent-step-head">
          <StepIndicator step={3} status={step3Status} />
          <div className="agent-step-title-wrap">
            <span className="agent-step-title">生成并复制指令</span>
            <span className="agent-step-desc">
              {!hasToken
                ? "请先完成第 1 步"
                : generatedInstruction
                  ? "指令已生成，复制给你的 AI 工具即可"
                  : "点击按钮，系统会把口令和发布方式组合成完整指令"}
            </span>
          </div>
        </div>
        {hasToken && (
          <div className="agent-step-body">
            {!generatedInstruction ? (
              <div className="agent-generate-area" style={{ marginTop: 0 }}>
                <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate}>
                  <Wand2 size={16} /> 生成发布指令
                </Button>
                {!canGenerate && publishMode === "update" && (
                  <span className="agent-generate-hint">请先填写原项目链接</span>
                )}
              </div>
            ) : (
              <div className="agent-instruction-result">
                <pre className="agent-instruction-body">{generatedInstruction}</pre>
                <div className="agent-instruction-action" style={{ border: "none", padding: "12px 0 0" }}>
                  <Button variant="primary" onClick={handleCopyInstruction}>
                    {copiedInstruction ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copiedInstruction ? " 已复制" : " 复制给 AI"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supported tools */}
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
print("AgentPublishPanel.tsx written - stepped version")
