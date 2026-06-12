import type { Demo, User, FormSubmission, HostedForm, SubdomainRequest, DeploymentStep } from "../../types";
import type { Inspection } from "../../api/demos";
import type { FormQuota } from "../../api/forms";
import { DemoList } from "../../components/dashboard/DemoList";
import { Button } from "../../components/Button";
import { DatabasePanel } from "./DatabasePanel";
import { FormDataPanel } from "./FormDataPanel";

function statusLabel(status: string): string {
  const map: Record<string, string> = { published: "在线", expired: "已过期", offline: "已下线" };
  return map[status] || status;
}

export function ProjectsView(
  _props: {
    demos: Demo[];
    selectedDemoId: string;
    selectedDemo: Demo | null;
    selectedInspection?: Inspection | null;
    selectedSteps?: DeploymentStep[];
    selectedForm?: HostedForm | null;
    selectedSubmissions?: FormSubmission[];
    formQuota?: FormQuota | null;
    detailOpen: boolean;
    onSelect: (id: string) => void;
    onCloseDetail: () => void;
    onCopyShare: (demo: Demo) => void;
    onCopyLink: (url?: string) => void;
    onUpdate: (demo: Demo) => void;
    onAction: (action: "offline" | "restore" | "delete", demo: Demo) => void;
    onRestartRuntime?: (demo: Demo) => void;
    onSaveRuntimeEnv?: (demo: Demo, env: Record<string, string>) => void;
    onResetDatabase?: (demo: Demo) => void;
    onCreate: () => void;
    onCreateForm?: (demo: Demo, fields?: HostedForm["fields"]) => void;
    onCopyText?: (text: string, successMessage?: string) => void;
    user?: User;
    onUpdateSlug?: (demo: Demo, slug: string) => void;
    onCreateSubdomainRequest?: (demo: Demo, subdomain: string) => void;
    subdomainRequests?: SubdomainRequest[];
    setActiveView?: any;  // eslint-disable-line
  }
) {
  const {
    demos,
    selectedDemoId,
    selectedDemo,
    detailOpen,
    onSelect,
    onCloseDetail,
    onCopyShare,
    onCopyLink,
    onUpdate,
    onAction,
    setActiveView,
  } = _props;

  const onlineCount = demos.filter((d) => d.status === "published").length;
  const demo = selectedDemo;

  return (
    <div className="workspace-home">
      <div className="ws-welcome" style={{ marginBottom: 24 }}>
        <div className="ws-section-head">
          <div>
            <h1 className="ws-greeting">我的作品</h1>
            <p className="ws-section-desc">共 {demos.length} 个项目，{onlineCount} 个在线</p>
          </div>
          <Button onClick={() => setActiveView?.("overview")}>发布新作品</Button>
        </div>
      </div>

      {!demos.length ? (
        <div className="ws-empty">
          <p>还没有发布过作品，从工作台开始发布吧</p>
        </div>
      ) : (
        <div className={`view-stack${detailOpen ? " has-detail" : ""}`}>
          <DemoList
            demos={demos}
            selectedDemoId={selectedDemoId}
            onSelect={onSelect}
            onCopyLink={onCopyLink}
          />

          {detailOpen && demo && (
            <div className="project-detail-panel">
              <div className="project-detail-head">
                <h3>{demo.name || demo.slug}</h3>
                <button className="project-detail-close" type="button" onClick={onCloseDetail}>
                  ✕
                </button>
              </div>

              <div className="project-detail-content">
                <div className="detail-block">
                  <label>试用链接</label>
                  {demo.publicUrl ? (
                    <div className="detail-link-row">
                      <code>{demo.publicUrl}</code>
                      <Button onClick={() => onCopyLink(demo.publicUrl)}><span>📋</span></Button>
                    </div>
                  ) : (
                    <span className="ws-project-meta">链接暂不可用</span>
                  )}
                </div>

                <div className="detail-block">
                  <label>状态</label>
                  <div className="detail-meta-row">
                    <span className={`demo-status status-${demo.status}`} />
                    <span>{statusLabel(demo.status)}</span>
                    {demo.createdAt && <span className="ws-project-meta"> · {new Date(demo.createdAt).toLocaleDateString("zh-CN")} 创建</span>}
                    {demo.updatedAt && <span className="ws-project-meta"> · {new Date(demo.updatedAt).toLocaleDateString("zh-CN")} 更新</span>}
                  </div>
                </div>

                <div className="detail-block">
                  <label>访问数据</label>
                  <span className="detail-visits">{demo.usage?.visits || 0} 次访问</span>
                </div>

                
                {/* ===== 数据库表数据 ===== */}
                {demo.database?.enabled && (
                  <DatabasePanel demoId={demo.id} database={demo.database} onReset={_props.onResetDatabase ? () => _props.onResetDatabase!(demo) : undefined} />
                )}

                {/* ===== 表单提交数据 ===== */}
                <FormDataPanel demoId={demo.id} />

<div className="detail-actions">
                  {demo.publicUrl && (
                    <a href={demo.publicUrl} target="_blank" rel="noreferrer" className="btn-pill">
                      ↗️ 打开试用
                    </a>
                  )}
                  {demo.publicUrl && <Button onClick={() => onCopyLink(demo.publicUrl)}>📋 复制</Button>}
                  <Button onClick={() => onCopyShare(demo)}>📤 转发</Button>
                  {demo.status === "published" && <Button onClick={() => onUpdate(demo)}>🔄 更新</Button>}
                  {demo.status === "published" && <Button onClick={() => onAction("offline", demo)}>📦 下线</Button>}
                  <Button onClick={() => onAction("delete", demo)} style={{ color: "var(--red-600)" }}>🗑️ 删除</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
