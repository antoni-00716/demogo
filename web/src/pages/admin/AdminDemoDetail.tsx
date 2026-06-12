import type { Demo, FailureDiagnosis } from "../../types";
import { Badge } from "../../components/Badge";
import { Button, LinkButton } from "../../components/Button";
import { RiskBadges } from "../../components/dashboard/RiskBadges";
import { AdminFailureDiagnosis } from "../../components/dashboard/AdminFailureDiagnosis";
import { demoStatusLabel } from "../../config/statuses";
import { formatBytes, formatDate } from "../../utils/format";
import { stackItemText, missingRequirementLabel } from "./adminDemoDetailHelpers";

export function AdminDemoDetail({
  demo,
  onUpdate
}: {
  demo: Demo;
  onUpdate: (action: "offline" | "delete", demo: Demo) => Promise<void>;
}) {
  const assessment = demo.projectProfile?.assessment || null;
  const projectTypeText = assessment?.projectKindLabel || demo.projectProfile?.summary || demo.projectCategory || demo.detectedType || "-";

  return (
    <div className="drawer-detail-stack">
      <div className="panel">
        <div>
          <h3>{demo.name || demo.slug}</h3>
          <p>{demo.userEmail || "-"} · {demo.publicUrl || demo.slug}</p>
        </div>
        <Badge tone={demo.status === "published" ? "success" : demo.status === "failed" ? "warning" : "neutral"}>{demoStatusLabel(demo.status)}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>访问链接</dt>
          <dd>{demo.publicUrl || "-"}</dd>
        </div>
        <div>
          <dt>访问量</dt>
          <dd>{demo.usage?.visits || 0} 次</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>V{demo.version || 1}</dd>
        </div>
        <div>
          <dt>发布方式</dt>
          <dd>{demo.deploySourceLabel || "网页上传"}</dd>
        </div>
        <div>
          <dt>托管架构</dt>
          <dd>{demo.hostingModeLabel || demo.hosting?.modeLabel || "静态试用链接"}</dd>
        </div>
        <div>
          <dt>项目类型</dt>
          <dd>{projectTypeText}</dd>
        </div>
        <div>
          <dt>运行状态</dt>
          <dd>{demo.runtime?.statusLabel || demo.hosting?.runtime?.statusLabel || "无需运行环境"}</dd>
        </div>
        {demo.runtime?.driver || demo.runtime?.containerName ? (
          <div>
            <dt>运行实例</dt>
            <dd>{[demo.runtime?.driver, demo.runtime?.containerName].filter(Boolean).join(" / ")}</dd>
          </div>
        ) : null}
        {demo.database?.enabled ? (
          <>
            <div>
              <dt>试用数据库</dt>
              <dd>{demo.database.statusLabel || "已启用"} · {demo.database.engine?.toUpperCase() || "MySQL"}</dd>
            </div>
            <div>
              <dt>数据库名</dt>
              <dd>{demo.database.databaseName || "-"}</dd>
            </div>
            <div>
              <dt>数据库账号</dt>
              <dd>{demo.database.userName || "-"}</dd>
            </div>
            <div>
              <dt>初始化状态</dt>
              <dd>{demo.database.schema?.statusLabel || "未检测到初始化脚本"}</dd>
            </div>
          </>
        ) : null}
        {demo.runtimeConfig?.missing?.length ? (
          <div>
            <dt>缺少配置</dt>
            <dd>{demo.runtimeConfig.missing.join("、")}</dd>
          </div>
        ) : null}
        {demo.externalBackend?.provider ? (
          <div>
            <dt>外部后端</dt>
            <dd>{demo.externalBackend.label || demo.externalBackend.provider} · {demo.externalBackend.statusLabel || "-"}</dd>
          </div>
        ) : null}
        <div>
          <dt>文件规模</dt>
          <dd>{demo.fileCount || 0} 个文件 / {formatBytes(demo.extractedBytes)}</dd>
        </div>
        <div>
          <dt>更新时间</dt>
          <dd>{formatDate(demo.updatedAt || demo.createdAt)}</dd>
        </div>
        <div>
          <dt>有效期</dt>
          <dd>{formatDate(demo.expiresAt)}</dd>
        </div>
      </dl>
      <AdminProjectAssessmentPanel demo={demo} />
      <AdminApplicationReadinessPanel demo={demo} />
      <AdminExternalBackendPanel demo={demo} />
      <div className="risk-panel">
        <h3>需要注意</h3>
        <RiskBadges demo={demo} />
      </div>
      {demo.runtime?.logSummary ? (
        <div className="runtime-log-panel">
          <h3>运行日志摘要</h3>
          <pre>{demo.runtime.logSummary}</pre>
        </div>
      ) : null}
      {demo.failureDiagnosis || demo.runtime?.failureDiagnosis ? <AdminFailureDiagnosis diagnosis={(demo.failureDiagnosis || demo.runtime?.failureDiagnosis) as FailureDiagnosis} /> : null}
      {demo.database?.schema?.error ? (
        <div className="runtime-log-panel">
          <h3>数据库初始化错误</h3>
          <pre>{demo.database.schema.error}</pre>
        </div>
      ) : null}
      <div className="row-actions">
        {demo.publicUrl ? <LinkButton href={demo.publicUrl} target="_blank" rel="noreferrer">打开试用链接</LinkButton> : null}
        {demo.status === "published" ? <Button onClick={() => onUpdate("offline", demo)}>下线项目</Button> : null}
        {demo.status !== "published" && demo.status !== "deleted" ? <Button variant="danger" onClick={() => onUpdate("delete", demo)}>删除项目</Button> : null}
      </div>
    </div>
  );
}

export function AdminProjectAssessmentPanel({ demo }: { demo: Demo }) {
  const profile = demo.projectProfile || null;
  const assessment = profile?.assessment || null;
  if (!profile && !assessment) return null;

  const fileSummary = demo.fileCount ? `${demo.fileCount} 个文件 / ${formatBytes(demo.extractedBytes)}` : "";
  const ext = assessment as Record<string, unknown> | null;
  const prof = profile as Record<string, unknown> | null;
  const rows = [
    { label: "项目类型", value: assessment?.projectKindLabel || profile?.summary || demo.projectCategory || demo.detectedType || "" },
    { label: "项目规模", value: fileSummary },
    { label: "项目框架", value: stackItemText(prof?.stack as Array<{ label?: string; code?: string }>) || profile?.framework || "" },
    { label: "缺失要求", value: ext?.missingRequirements ? (ext.missingRequirements as string[]).map(missingRequirementLabel).join("、") : "" },
    { label: "发布建议", value: (ext?.publishSuggestion as string) || (ext?.verdict as string) || "" },
    { label: "发布评估", value: (ext?.statusLabel as string) || (ext?.status as string) || "" }
  ].filter((item) => item.value);

  return (
    <div className="admin-project-assessment">
      <div className="admin-project-assessment-head">
        <div>
          <h3>项目评估</h3>
          <p>{(ext?.summary as string) || profile?.summary || "DemoGo 已分析该项目。"}</p>
        </div>
        <Badge tone={(ext?.status as string) === "ready" ? "success" : (ext?.status as string) === "needs_work" ? "warning" : "info"}>
          {(ext?.publishSuggestionLabel as string) || (ext?.ready ? "可发布" : "先处理后发布")}
        </Badge>
      </div>
      {rows.length ? (
        <dl className="admin-project-assessment-list">
          {rows.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function AdminApplicationReadinessPanel({ demo }: { demo: Demo }) {
  const readiness = demo.applicationReadiness;
  if (!readiness) return null;
  const tone = readiness.status === "ready" ? "success" : readiness.status === "blocked" ? "warning" : "info";
  const blockers = (readiness.checklist || []).filter((item) => ["missing", "blocked", "warning"].includes(item.status || ""));
  const report = readiness.deliveryReport;
  const rows = [
    { label: "验收类型", value: readiness.label || readiness.kind || "" },
    { label: "综合状态", value: `${readiness.statusLabel || "待检查"} · ${readiness.score || 0}%` },
    { label: "交付判断", value: report?.verdictLabel || "" },
    { label: "交付动作", value: report?.primaryAction || "" },
    { label: "主要缺口", value: blockers.length ? blockers.slice(0, 5).map((item) => item.label).join("、") : "无明显缺口" },
    { label: "下一步", value: readiness.missingActions?.length ? readiness.missingActions.slice(0, 3).join("；") : "" }
  ].filter((item) => item.value);

  return (
    <div className="admin-project-assessment application-readiness-panel">
      <div className="admin-project-assessment-head">
        <div>
          <h3>完整应用试用闭环</h3>
          <p>{readiness.summary || "DemoGo 已对页面、接口、数据库、配置和版本更新形成综合判断。"}</p>
        </div>
        <Badge tone={tone}>{readiness.statusLabel || "待检查"}</Badge>
      </div>
      <dl className="admin-project-assessment-list">
        {rows.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {blockers.length ? (
        <ul>
          {blockers.slice(0, 5).map((item) => (
            <li key={item.code || item.label}>{item.label}：{item.detail}</li>
          ))}
        </ul>
      ) : null}
      {report?.risks?.length ? (
        <ul>
          {report.risks.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminExternalBackendPanel({ demo }: { demo: Demo }) {
  const backend = demo.externalBackend;
  if (!backend?.provider) return null;
  const tone = backend.status === "ready" ? "success" : backend.status === "failed" ? "warning" : "info";
  const rows = [
    { label: "类型", value: backend.label || backend.provider },
    { label: "状态", value: backend.statusLabel || backend.status },
    { label: "缺少配置", value: backend.missingEnv?.length ? backend.missingEnv.join("、") : "" },
    { label: "已填配置", value: backend.configuredEnv?.length ? backend.configuredEnv.join("、") : "" },
    { label: "连接检测", value: backend.connection?.message || backend.connection?.statusLabel || "" },
    { label: "检测时间", value: backend.connection?.checkedAt ? formatDate(backend.connection.checkedAt) : "" }
  ].filter((item) => item.value);

  return (
    <div className="admin-project-assessment">
      <div className="admin-project-assessment-head">
        <div>
          <h3>外部后端连接</h3>
          <p>{backend.nextAction || "DemoGo 已识别该项目需要外部后端配置。"}</p>
        </div>
        <Badge tone={tone}>{backend.statusLabel || "外部后端"}</Badge>
      </div>
      {rows.length ? (
        <dl className="admin-project-assessment-list">
          {rows.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {backend.warnings?.length ? (
        <ul>
          {backend.warnings.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
