import { useCallback, useEffect, useState } from "react";
import type { Demo } from "../../types";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { RiskBadges } from "../../components/dashboard/RiskBadges";
import { demoStatusLabel } from "../../config/statuses";
import { formatDate } from "../../utils/format";
import { adminOfflineDemo, adminDeleteDemo, getAdminRuntimes, adminStopDemoRuntime } from "../../api/admin";
import { AdminDetailDrawer } from "./AdminDetailDrawer";
import { AdminDemoDetail } from "./AdminDemoDetail";
import type { AdminMetrics } from "../../types";

export function AdminDemoList({
  demos,
  onChanged,
  onError,
  compact = false
}: {
  demos: Demo[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
  compact?: boolean;
}) {
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const selectedDemo = demos.find((demo) => demo.id === selectedDemoId) || null;

  const totalDemos = demos.length;
  const onlineDemos = demos.filter((d) => d.status === "published").length;
  const reviewDemos = demos.filter((d) => d.status === "review_required").length;
  const expiredDemos = demos.filter((d) => d.status === "expired").length;

  const filtered = filterStatus === "all" ? demos
    : filterStatus === "online" ? demos.filter((d) => d.status === "published")
    : filterStatus === "review" ? demos.filter((d) => d.status === "review_required")
    : filterStatus === "expired" ? demos.filter((d) => d.status === "expired")
    : demos;

  async function update(action: "offline" | "delete", demo: Demo) {
    const label = action === "offline" ? "下线" : "删除";
    if (!window.confirm(`确定${label}这个试用项目？`)) return;
    try {
      if (action === "offline") await adminOfflineDemo(demo.id);
      if (action === "delete") await adminDeleteDemo(demo.id);
      await onChanged(`试用项目已${label}。`);
      if (action === "delete") setSelectedDemoId("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "试用项目操作失败。");
    }
  }

  return (
    <>
      <Card className={`panel ${compact ? "compact-panel" : ""}`} id="demos">
        <div className="panel-head">
          <div>
            <h2>试用项目</h2>
            <p>查看作品状态、访问量和需要注意的问题。具体干预动作放在详情里处理。</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">全部 Demo</div>
            <div className="stat-value">{totalDemos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">在线中</div>
            <div className="stat-value">{onlineDemos}</div>
            <div className="stat-change up">{totalDemos > 0 ? `${((onlineDemos / totalDemos) * 100).toFixed(0)}%` : "-"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">审核中</div>
            <div className="stat-value">{reviewDemos}</div>
            {reviewDemos > 0 && <div className="stat-change down">需处理</div>}
          </div>
          <div className="stat-card">
            <div className="stat-label">已过期</div>
            <div className="stat-value">{expiredDemos}</div>
            {expiredDemos > 0 && <div className="stat-change down">{((expiredDemos / totalDemos) * 100).toFixed(0)}%</div>}
          </div>
        </div>

        {/* Filter */}
        <div className="feedback-filters" style={{ marginBottom: 16 }}>
          <button className={`filter-btn${filterStatus === "all" ? " active" : ""}`} onClick={() => setFilterStatus("all")}>全部状态</button>
          <button className={`filter-btn${filterStatus === "online" ? " active" : ""}`} onClick={() => setFilterStatus("online")}>在线</button>
          <button className={`filter-btn${filterStatus === "review" ? " active" : ""}`} onClick={() => setFilterStatus("review")}>审核中</button>
          <button className={`filter-btn${filterStatus === "expired" ? " active" : ""}`} onClick={() => setFilterStatus("expired")}>已过期</button>
        </div>
        {!demos.length ? (
          <EmptyState title="暂无试用项目" description="用户生成试用链接后，会出现在这里。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>试用项目</th>
                  <th>用户</th>
                  <th>托管方式</th>
                  <th>状态</th>
                  <th>访问</th>
                  <th>需要注意</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((demo) => (
                  <tr key={demo.id}>
                    <td>
                      <strong>{demo.name || demo.slug}</strong>
                      <small>{demo.publicUrl || demo.slug}</small>
                    </td>
                    <td>{demo.userEmail || "-"}</td>
                    <td>
                      <strong>{demo.hostingModeLabel || demo.hosting?.modeLabel || "静态试用链接"}</strong>
                      <small>{demo.projectProfile?.summary || demo.projectCategory || demo.detectedType || "-"}</small>
                    </td>
                    <td>{demoStatusLabel(demo.status)}</td>
                    <td>{demo.usage?.visits || 0}</td>
                    <td><RiskBadges demo={demo} /></td>
                    <td><Button onClick={() => setSelectedDemoId(demo.id)}>查看详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedDemo ? (
        <AdminDetailDrawer title="试用项目详情" subtitle={selectedDemo.name || selectedDemo.slug} onClose={() => setSelectedDemoId("")}>
          <AdminDemoDetail demo={selectedDemo} onUpdate={update} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

export function AdminRuntimeOps({
  metrics,
  initialDemos,
  onChanged,
  onError
}: {
  metrics: AdminMetrics;
  initialDemos: Demo[];
  onChanged: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const [demos, setDemos] = useState<Demo[]>(initialDemos);
  const [summary, setSummary] = useState(metrics.runtime || {});
  const [loading, setLoading] = useState(false);
  const showRuntimeError = useCallback((text: string) => onError(text), [onError]);

  async function loadRuntimeData() {
    try {
      setLoading(true);
      const payload = await getAdminRuntimes();
      setDemos(payload.demos || []);
      setSummary(payload.summary || {});
    } catch (error) {
      onError(error instanceof Error ? error.message : "运行环境数据加载失败。");
    } finally {
      setLoading(false);
    }
  }

  async function stopRuntime(demo: Demo) {
    if (!window.confirm("确定停止这个 Node.js 试用环境？停止后用户再次访问时，平台会尝试重新启动。")) return;
    try {
      await adminStopDemoRuntime(demo.id);
      await loadRuntimeData();
      await onChanged("运行环境已停止。");
    } catch (error) {
      onError(error instanceof Error ? error.message : "运行环境停止失败。");
    }
  }

  useEffect(() => {
    let mounted = true;
    getAdminRuntimes()
      .then((payload) => {
        if (!mounted) return;
        setDemos(payload.demos || []);
        setSummary(payload.summary || {});
      })
      .catch((error) => {
        if (mounted) showRuntimeError(error instanceof Error ? error.message : "运行环境数据加载失败。");
      });
    return () => {
      mounted = false;
    };
  }, [showRuntimeError]);

  const stats = [
    ["Node 项目", summary.nodeProjects || 0, "已发布过的 Node.js 试用项目"],
    ["运行中", summary.runningRuntimes || 0, "当前内存中的运行实例"],
    ["MySQL 库", summary.mysqlDatabases || 0, "已分配的试用数据库"],
    ["可用库", summary.mysqlReady || 0, "状态正常的 MySQL 试用库"]
  ];

  return (
    <Card className="panel" id="runtimeOps">
      <div className="panel-head">
        <div>
          <h2>运行环境</h2>
          <p>这里用于观察 Node.js 单服务和 MySQL 试用库。停止运行环境不会删除项目和数据库，用户再次访问时会自动尝试重启。</p>
        </div>
        <Button onClick={loadRuntimeData} disabled={loading}>{loading ? "刷新中..." : "刷新"}</Button>
      </div>
      <div className="admin-summary-grid runtime-summary-grid">
        {stats.map(([label, value, note]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </div>
        ))}
      </div>
      {!demos.length ? (
        <EmptyState title="暂无运行环境项目" description="Node.js 或 MySQL 项目发布后，会出现在这里。" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>用户</th>
                <th>运行状态</th>
                <th>试用数据库</th>
                <th>有效期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {demos.map((demo) => (
                <tr key={demo.id}>
                  <td>
                    <strong>{demo.name || demo.slug}</strong>
                    <small>{demo.publicUrl || demo.slug}</small>
                  </td>
                  <td>{demo.userEmail || "-"}</td>
                  <td>
                    <strong>{demo.runtime?.statusLabel || "无需运行环境"}</strong>
                    <small>{[demo.runtime?.driver, demo.runtime?.containerName].filter(Boolean).join(" / ") || "无运行实例"}</small>
                  </td>
                  <td>
                    <strong>{demo.database?.enabled ? `${demo.database.engine?.toUpperCase() || "MySQL"} · ${demo.database.statusLabel || "已启用"}` : "未分配"}</strong>
                    <small>{demo.database?.databaseName || ""}</small>
                  </td>
                  <td>{formatDate(demo.expiresAt)}</td>
                  <td>
                    {demo.hostingMode === "node_runtime" && demo.status === "published"
                      ? <Button onClick={() => stopRuntime(demo)}>停止运行</Button>
                      : <span className="muted">无需操作</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

