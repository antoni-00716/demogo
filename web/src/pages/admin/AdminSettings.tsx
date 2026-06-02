import { Card } from "../../components/Card";

export function AdminSettings() {
  return (
    <Card className="panel" id="settings">
      <h2>系统设置</h2>
      <div className="settings-list">
        <div>
          <strong>套餐名称</strong>
          <span>固定为 Free、Lite、Pro，避免用户端和运营端口径不一致。</span>
        </div>
        <div>
          <strong>升级流程</strong>
          <span>用户提交申请后，管理员只在"升级申请"里人工开通或拒绝。</span>
        </div>
        <div>
          <strong>生成链接能力</strong>
          <span>当前支持可直接打开的网页和常见 AI 工具导出的页面，完整后台业务托管后续再规划。</span>
        </div>
      </div>
    </Card>
  );
}
