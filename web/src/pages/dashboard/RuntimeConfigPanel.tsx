import type { Demo } from "../../types";
import { useState } from "react";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";


function createRuntimeFixPrompt(demo: Demo) {
  void demo;
  return "Please configure your project as a Node.js single-service project:\n1. Root directory needs package.json\n2. package.json needs a start script (e.g. node server.js or tsx src/index.ts)\n3. Service listens on PORT env variable (e.g. process.env.PORT || 3000)\n\nFor Next.js projects, just upload directly. DemoGo will auto-start with next start.";
}

export function RuntimeConfigPanel({
  demo,
  onSave,
  onCopyText
}: {
  demo: Demo;
  onSave: (demo: Demo, env: Record<string, string>) => void;
  onCopyText: (text: string, successMessage?: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const config = demo.runtimeConfig;
  if (!config) return null;
  const required = config.missing || [];
  const configured = demo.runtimeEnv || {};
  const tone = config.status === "ready" ? "success" : config.status === "missing" ? "warning" : "info";
  const aiPrompt = createRuntimeFixPrompt(demo);

  return (
    <div className="hosting-architecture runtime-config-panel">
      <div className="section-mini-head">
        <div>
          <h3>运行配置</h3>
          <p>{config.nextAction || "DemoGo 检测到该项目需要配置运行环境变量。"}</p>
        </div>
        <Badge tone={tone}>{config.statusLabel || "运行配置"}</Badge>
      </div>
      <div className="runtime-env-grid">
        {required.map((key) => (
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
      <div className="runtime-help-box">
        <strong>使用说明</strong>
        <ul>
          <li>DemoGo 会将配置注入到项目运行环境中。</li>
          <li>如果项目构建时读取这些变量，请先保存配置，再用"更新版本"重新发布。</li>
          <li>敏感值（如密码）DemoGo 会自动掩码，但依然建议使用环境变量而非硬编码。</li>
        </ul>
      </div>
      <div className="row-actions compact">
        <Button onClick={() => onSave(demo, values)}>保存运行配置</Button>
        {aiPrompt ? <Button onClick={() => onCopyText(aiPrompt, "运行配置说明已复制。")}>复制给 AI 怎么改</Button> : null}
      </div>
    </div>
  );
}
