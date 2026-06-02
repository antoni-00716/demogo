import type { Demo } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { formatDate } from "../../utils/format";

export function DatabasePanel({ database, onReset }: { database?: Demo["database"] | null; onReset?: () => void }) {
  if (!database?.enabled) return null;
  return (
    <div className="hosting-architecture database-panel">
      <div className="section-mini-head">
        <div>
          <h3>试用数据库</h3>
          <p>这个项目已分配独立的 MySQL 试用库，只用于当前试用环境。</p>
        </div>
        <Badge tone={database.status === "ready" ? "success" : "neutral"}>{database.statusLabel || "已启用"}</Badge>
      </div>
      <div className="hosting-route-grid">
        <span>数据库：{database.databaseName || "-"}</span>
        <span>账号：{database.userName || "-"}</span>
        <span>类型：{database.engine?.toUpperCase() || "MySQL"}</span>
        <span>初始化：{database.schema?.statusLabel || "未检测到初始化脚本"}</span>
        <span>创建时间：{formatDate(database.createdAt || "")}</span>
        {database.resetAt ? <span>最近重置：{formatDate(database.resetAt)}</span> : null}
      </div>
      {database.schema?.error ? (
        <div className="runtime-log-panel">
          <strong>数据库初始化错误</strong>
          <pre>{database.schema.error}</pre>
        </div>
      ) : null}
      <div className="runtime-help-box">
        <strong>使用说明</strong>
        <ul>
          <li>DemoGo 已把数据库连接信息注入到运行环境，项目代码通过 MYSQL_HOST、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD 或 DATABASE_URL 读取。</li>
          <li>如果项目包根目录包含 schema.sql，DemoGo 会在创建或重置数据库时尝试执行。</li>
          <li>Prisma、Sequelize、TypeORM 等迁移暂不自动执行，请先用 schema.sql 或应用启动逻辑完成初始化。</li>
        </ul>
      </div>
      {onReset ? <div className="row-actions compact"><Button variant="danger" onClick={onReset}>重置试用数据库</Button></div> : null}
    </div>
  );
}
