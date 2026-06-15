import { type DragEvent } from "react";
import type { Demo, DeploymentStep } from "../../types";
import type { Inspection } from "../../api/demos";
import { Button } from "../../components/Button";
import { isSupportedArchive } from "./utils";
import { DeploymentSteps } from "../../components/dashboard/DashPanels";

/* ---- Step dot (same as AI publish page) ---- */
type StepStatus = "pending" | "active" | "completed";
function StepDot({ step, status }: { step: number; status: StepStatus }) {
  if (status === "completed")
    return <div className="ag-step-dot completed"><span>✅</span></div>;
  return <div className={`ag-step-dot ${status}`}>{step}</div>;
}
function StepArrow() {
  return (
    <div className="ag-step-arrow">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

export function UploadPanel({
  file,
  setFile,
  name,
  setDemoName,
  updateTarget,
  onCancelUpdate,
  inspection,
  steps,
  latestDemo,
  deploying,
  onPublish,
  onCopyShare,
  onCopyLink,
  onFileRejected,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  name: string;
  setDemoName: (v: string) => void;
  updateTarget: Demo | null;
  onCancelUpdate: () => void;
  inspection: Inspection | null;
  steps: DeploymentStep[];
  latestDemo: Demo | null;
  deploying: boolean;
  onPublish: () => void;
  onCopyShare: (demo: Demo) => void;
  onCopyLink: (url?: string) => void;
  onFileRejected: (name: string) => void;
}) {
  const hasFile = !!file;
  const isDone = !!latestDemo && !deploying;
  const hasSteps = steps.length > 0;

  const s1: StepStatus = hasFile || isDone ? "completed" : "active";
  const s2: StepStatus = !hasFile ? "pending" : isDone ? "completed" : "active";

  function handleFile(file: File | null) {
    if (!file) { setFile(null); return; }
    if (!isSupportedArchive(file.name)) { setFile(null); onFileRejected(file.name); return; }
    setFile(file);
  }

  return (
    <div className="upload-card">

      {/* === STEP 1 === */}
      <div className={`ag-step ${s1}`}>
        <div className="ag-step-head">
          <StepDot step={1} status={s1} />
          <div className="ag-step-text">
            <span className="ag-step-title">选择项目文件</span>
            <span className="ag-step-desc">
              {updateTarget ? `正在更新 ${updateTarget.name || updateTarget.slug}，请选择新版本文件`
                : hasFile ? "文件已选择，可以开始发布"
                : "把你的项目打包成 ZIP 文件，拖拽或点击上传"}
            </span>
          </div>
        </div>
        <div className="ag-step-body">
          {!isDone && (
            <>
              <DropZone file={file} onFile={handleFile} />
              {!updateTarget && (
                <>
                  <div className="form-group">
                    <label className="form-label">项目名称（选填）</label>
                    <input
                      className="form-input"
                      value={name}
                      onChange={(e) => setDemoName(e.target.value)}
                      placeholder="DemoGo 会自动识别"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">文件类型</label>
                    <select className="form-select">
                      <option>自动识别</option>
                      <option>静态网页</option>
                      <option>前端源码</option>
                      <option>Node 服务</option>
                    </select>
                  </div>
                </>
              )}
              {updateTarget && (
                <div style={{ marginTop: 12 }}>
                  <Button variant="ghost" onClick={onCancelUpdate} style={{ color: "var(--text-tertiary)" }}>
                    取消更新，改为发布新项目
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <StepArrow />

      {/* === STEP 2 === */}
      <div className={`ag-step ${s2}`}>
        <div className="ag-step-head">
          <StepDot step={2} status={s2} />
          <div className="ag-step-text">
            <span className="ag-step-title">发布上线</span>
            <span className="ag-step-desc">
              {!hasFile ? "请先选择项目文件"
                : isDone ? "发布成功！复制链接分享给你的用户"
                : deploying ? "DemoGo 正在检查并部署你的项目..."
                : "点击按钮，DemoGo 会自动检查项目并生成试用链接"}
            </span>
          </div>
        </div>
        <div className="ag-step-body">
          {/* Before publish */}
          {!isDone && !deploying && hasFile && (
            <div className="form-actions">
              <Button variant="primary" onClick={onPublish} style={{ flex: 1, justifyContent: "center", minHeight: 44 }}>
                📦 {updateTarget ? "更新上线" : "发布上线"}
              </Button>
              <button className="btn-pill btn-pill--outline btn-pill--disabled" disabled style={{ flex: 1, justifyContent: "center" }}>
                👁️ 预览
              </button>
            </div>
          )}

          {/* Deploying progress */}
          {deploying && hasSteps && (
            <div style={{ marginTop: 4 }}>
              <DeploymentSteps steps={steps} />
            </div>
          )}

          {/* Inspection result */}
          {inspection && !inspection.canPublish && !deploying && !isDone && (
            <InspectionPanel inspection={inspection} />
          )}

          {/* Success */}
          {isDone && latestDemo && (
            <div className="ag-result">
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--green)" }}>✅</span>
                  <strong style={{ fontSize: 15 }}>发布成功</strong>
                </div>
                {latestDemo.publicUrl && (
                  <code style={{
                    padding: "10px 14px", background: "#fdfdfc", borderRadius: 8,
                    border: "1px solid var(--border-light)", fontSize: 13, wordBreak: "break-all"
                  }}>
                    {latestDemo.publicUrl}
                  </code>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <Button variant="primary" onClick={() => onCopyLink(latestDemo.publicUrl)}>
                    📋 复制链接
                  </Button>
                  <Button onClick={() => onCopyShare(latestDemo)}>
                    ↗️ 转发文案
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supported types */}
      <div className="ag-tools">
        <span>📦</span>
        <span>支持</span>
        <strong>静态网页</strong>
        <span>·</span>
        <strong>前端源码</strong>
        <span>（自动构建）</span>
        <span>·</span>
        <strong>Node 单服务</strong>
      </div>
    </div>
  );
}

/* ---- Drop zone ---- */
function DropZone({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    onFile(e.dataTransfer.files?.[0] || null);
  }

  return (
    <label
      className="upload-zone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".zip,.tar.gz,.tgz,application/zip,application/gzip"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        style={{ display: "none" }}
      />
      {file ? (
        <div className="up-file-selected">
          <span>📦</span>
          <strong>{file.name}</strong>
          <button className="up-file-remove" onClick={(e) => { e.preventDefault(); onFile(null); }}>
            ✕
          </button>
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center" }}>
            <div className="upload-zone-icon">📦</div>
            <div className="upload-zone-text">拖拽 ZIP 文件到这里，或点击选择</div>
            <div className="upload-zone-hint">支持 .zip .tar.gz .tgz · 最大 50MB</div>
          </div>
        </>
      )}
    </label>
  );
}

/* ---- Inspection result (non-blocking) ---- */
function InspectionPanel({ inspection }: { inspection: Inspection }) {
  return (
    <div className="ag-result" style={{ marginTop: 14 }}>
      <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <strong style={{ display: "block", marginBottom: 6, color: inspection.canPublish ? "var(--green-600)" : "var(--amber-600)" }}>
          {inspection.canPublish ? "检查通过" : "需要注意"}
        </strong>
        {inspection.userSummary || inspection.summary || (inspection.canPublish ? "项目结构正常，可以发布。" : "项目存在一些问题，请查看详情。")}
      </div>
    </div>
  );
}
