import { useState } from "react";
import type { AdminUser } from "../../types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { planName } from "../../config/plans";
import { formatDate } from "../../utils/format";
import { AdminDetailDrawer } from "./AdminDetailDrawer";

export function AdminUsers({ users, compact = false }: { users: AdminUser[]; compact?: boolean }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  return (
    <>
      <Card className={`panel ${compact ? "compact-panel" : ""}`} id="users">
        <div className="panel-head">
          <div>
            <h2>用户列表</h2>
            <p>这里只看用户和套餐状态，开通套餐仍然从升级申请进入。</p>
          </div>
        </div>
        {!users.length ? (
          <EmptyState title="暂无用户" description="用户注册后，会显示在这里。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>套餐</th>
                  <th>试用项目</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 80).map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{planName(user.plan)}</td>
                    <td>{user.onlineDemoCount || 0} 在线 / {user.demoCount || 0} 累计</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td><Button onClick={() => setSelectedUserId(user.id)}>查看详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedUser ? (
        <AdminDetailDrawer title="用户详情" subtitle={selectedUser.email} onClose={() => setSelectedUserId("")}>
          <AdminUserDetail user={selectedUser} />
        </AdminDetailDrawer>
      ) : null}
    </>
  );
}

export function AdminUserDetail({ user }: { user: AdminUser }) {
  return (
    <div className="drawer-detail-stack">
      <div className="request-main">
        <div>
          <h3>{user.email}</h3>
          <p>{formatDate(user.createdAt)} 注册</p>
        </div>
        <Badge tone={user.plan === "pro" ? "success" : user.plan === "lite" ? "info" : "neutral"}>{planName(user.plan)}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>当前套餐</dt>
          <dd>{planName(user.plan)}</dd>
        </div>
        <div>
          <dt>在线试用项目</dt>
          <dd>{user.onlineDemoCount || 0} 个</dd>
        </div>
        <div>
          <dt>累计试用项目</dt>
          <dd>{user.demoCount || 0} 个</dd>
        </div>
        <div>
          <dt>用户 ID</dt>
          <dd>{user.id}</dd>
        </div>
      </dl>
      <p className="muted">如需调整套餐，请让用户提交升级申请，再从"升级申请"页面处理，避免后台入口不一致。</p>
    </div>
  );
}
