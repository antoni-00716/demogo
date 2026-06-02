import type { Demo } from "../../types";
import { useState } from "react";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { formatDate } from "../../utils/format";

function createSupabaseFixPrompt(_demo: Demo) {
  void _demo;
  return "Please add Supabase URL and anon key to your project environment variables.";
}

export function ExternalBackendPanel({
  demo,
  onSave,
  onCopyText
}: {
  demo: Demo;
  onSave: (demo: Demo, env: Record<string, string>) => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const backend = demo.externalBackend;
  const required = backend?.requiredEnv || [];
  const configured = demo.runtimeEnv || {};
  const [values, setValues] = useState<Record<string, string>>({});
  if (backend?.provider !== "supabase") return null;

  const editableKeys = Array.from(new Set(required.length ? required : ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]));
  const missing = backend.missingEnv || [];
  const tone = backend.status === "ready" ? "success" : backend.status === "failed" ? "warning" : "info";
  const aiPrompt = createSupabaseFixPrompt(demo);

  return (
    <div className="hosting-architecture external-backend-panel">
      <div className="section-mini-head">
        <div>
          <h3>Supabase 连接</h3>
          <p>{backend.nextAction || "这个项目使用你自己的 Supabase。DemoGo 只保存 anon key，并在构建或运行时注入配置。"}</p>
        </div>
        <Badge tone={tone}>{backend.statusLabel || "Supabase"}</Badge>
      </div>
      <div className="runtime-env-grid">
        {editableKeys.map((key) => (
          <label key={key}>
            <span>{key}</span>
            <input
              className="input"
              value={values[key] || ""}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={configured[key]?.maskedValue || "输入后保存"}
            />
          </label>
        ))}
      </div>
      <div className="hosting-route-grid">
        <span>配置状态：{missing.length ? `缺少 ${missing.join("、")}` : "已保存必要配置"}</span>
        <span>连接检测：{backend.connection?.statusLabel || "保存后自动检测"}</span>
        {backend.connection?.checkedAt ? <span>检测时间：{formatDate(backend.connection.checkedAt)}</span> : null}
      </div>
      {backend.connection?.message || backend.warnings?.length ? (
        <div className="runtime-help-box">
          {backend.connection?.message ? <p>{backend.connection.message}</p> : null}
          {backend.warnings?.length ? <ul>{backend.warnings.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </div>
      ) : null}
      <div className="runtime-help-box">
        <strong>安全边界</strong>
        <ul>
          <li>填写 Supabase URL 和 anon key，不要填写 service_role。</li>
          <li>DemoGo 不创建 Supabase 项目，也不自动执行外部数据库迁移。</li>
          <li>如果项目构建时读取这些变量，请先保存配置，再用"更新版本"重新发布。</li>
        </ul>
      </div>
      <div className="row-actions compact">
        <Button onClick={() => onSave(demo, values)}>保存并检测连接</Button>
        {aiPrompt ? <Button onClick={() => onCopyText(aiPrompt, "Supabase 接入说明已复制。")}>复制给 AI 怎么改</Button> : null}
      </div>
    </div>
  );
}
