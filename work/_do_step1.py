import os
path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "w", encoding="utf-8") as f:
    f.write(r'''import { useState } from "react";
import type { AgentToken } from "../../types";
import { Button } from "../../components/Button";
import { Sparkles, Copy, CheckCircle2, Eye, EyeOff, Upload, RefreshCw, Wand2 } from "lucide-react";
import { createAgentInstruction } from "./utils";

type StepStatus = "pending" | "active" | "completed";

function StepDot({ step, status }: { step: number; status: StepStatus }) {
  if (status === "completed") {
    return <div className="ag-step-dot completed"><CheckCircle2 size={18} /></div>;
  }
  return <div className={`ag-step-dot ${status}`}>{step}</div>;
}

/** A single step block with indicator + head + body */
function StepBlock({
  step,
  status,
  title,
  desc,
  children,
}: {
  step: number;
  status: StepStatus;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`ag-step ${status}`}>
      <div className="ag-step-head">
        <StepDot step={step} status={status} />
        <div className="ag-step-text">
          <span className="ag-step-title">{title}</span>
          <span className="ag-step-desc">{desc}</span>
        </div>
      </div>
      {status !== "pending" && <div className="ag-step-body">{children}</div>}
    </div>
  );
}

/* Arrows between steps */
function StepArrow() {
  return (
    <div className="ag-step-arrow">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
  const canGenerate = publishMode === "new" || (publishMode === "update" && updateUrl.trim());

  const s1: StepStatus = hasToken ? "completed" : "active";
  const s2: StepStatus = !hasToken ? "pending" : generatedInstruction ? "completed" : "active";
  const s3: StepStatus = !hasToken ? "pending" : generatedInstruction ? "completed" : "active";

  function handleGenerate() {
    const text = createAgentInstruction(token, {
      mode: publishMode,
      updateUrl: publishMode === "update" ? updateUrl : undefined,
    });
    setGeneratedInstruction(text);
    setCopiedInstruction(false);
  }

  async function copyToClipboard(text: string, setDone: (v: boolean) => void) {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {}
  }

  return (
    <div className="workspace-home">

      {/* === STEP 1 === */}
      <StepBlock
        step={1} status={s1}
        title="生成发布口令"
        desc={hasToken
          ? "口令已生成，AI 就是靠它连接到你的 DemoGo 账号"
          : "首次使用需要生成口令，之后每次发布都不需要重复操作"}
      >
        {hasToken ? (
          <div className="ag-token-row">
            <code className="ag-token-value">
              {showToken ? tokenValue
                : token?.prefix
                  ? token.prefix + "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            </code>
            <button className="ag-token-eye" onClick={() => setShowToken(!showToken)} title={showToken ? "隐藏" : "显示"}>
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <Button variant="ghost" onClick={() => copyToClipboard(tokenValue, setCopiedToken)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {copiedToken ? <><CheckCircle2 size={13} /><span style={{marginLeft:3}}>已复制</span></> : <><Copy size={13} /><span style={{marginLeft:3}}>复制</span></>}
            </Button>
            <span className="ag-token-div" />
            <button className="ag-token-reset" onClick={onResetToken}>重新生成</button>
          </div>
        ) : (
          <Button variant="primary" onClick={onResetToken}><Sparkles size={16} /> 生成口令</Button>
        )}
      </StepBlock>

      <StepArrow />

      {/* === STEP 2 === */}
      <StepBlock
        step={2} status={s2}
        title="选择发布方式"
        desc={!hasToken ? "请先完成第 1 步" : "新项目发布会生成一个新链接，更新已有项目会把改动同步到原链接"}
      >
        <div className="ag-mode-row">
          <button className={`ag-mode-btn ${publishMode === "new" ? "active" : ""}`}
            onClick={() => { setPublishMode("new"); setGeneratedInstruction(""); }}>
            <Upload size={18} />
            <strong>发布新项目</strong>
            <span>把项目首次发到 DemoGo，获得一个试用链接</span>
          </button>
          <button className={`ag-mode-btn ${publishMode === "update" ? "active" : ""}`}
            onClick={() => { setPublishMode("update"); setGeneratedInstruction(""); }}>
            <RefreshCw size={18} />
            <strong>更新已有项目</strong>
            <span>项目改好了，更新到之前发布的链接</span>
          </button>
        </div>
        {publishMode === "update" && (
          <input className="ag-url-input" type="text" placeholder="粘贴你之前发布过的 DemoGo 链接"
            value={updateUrl} onChange={(e) => { setUpdateUrl(e.target.value); setGeneratedInstruction(""); }} />
        )}
      </StepBlock>

      <StepArrow />

      {/* === STEP 3 === */}
      <StepBlock
        step={3} status={s3}
        title="生成并复制指令"
        desc={!hasToken ? "请先完成第 1 步"
          : generatedInstruction ? "指令已生成，复制给你的 AI 工具即可"
          : "点击按钮，系统会把你的口令和发布方式组合成一段 AI 能看懂的指令"}
      >
        {!generatedInstruction ? (
          <div className="ag-gen-row">
            <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate}>
              <Wand2 size={16} /> 生成发布指令
            </Button>
            {!canGenerate && <span className="ag-gen-hint">请先填写原项目链接</span>}
          </div>
        ) : (
          <div className="ag-result">
            <pre className="ag-result-pre">{generatedInstruction}</pre>
            <div className="ag-result-action">
              <Button variant="primary" onClick={() => copyToClipboard(generatedInstruction, setCopiedInstruction)}>
                {copiedInstruction ? <><CheckCircle2 size={16} /> 已复制</> : <><Copy size={16} /> 复制给 AI</>}
              </Button>
            </div>
          </div>
        )}
      </StepBlock>

      {/* Supported tools */}
      <div className="ag-tools">
        <span>支持</span>
        <strong>Cursor</strong>
        <span>·</span>
        <strong>Windsurf</strong>
        <span>·</span>
        <strong>Codex</strong>
        <span>·</span>
        <strong>Claude Code</strong>
      </div>
    </div>
  );
}
''')
print("AgentPublishPanel.tsx written")
