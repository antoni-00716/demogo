import { Badge } from "../Badge";
import type { Demo } from "../../types";

interface ProjectAssessmentPanelProps {
  assessment: NonNullable<NonNullable<Demo["projectProfile"]>["assessment"]>;
}

function missingRequirementLabel(value: string) {
  const labels: Record<string, string> = {
    missing_build_script: "缺少网页生成命令",
    missing_start_script: "缺少应用启动命令",
    missing_env_variables: "缺少环境变量配置",
    unsupported_database: "不支持的数据类型",
    unsupported_monorepo: "暂不支持多包仓库",
    unsupported_build_tool: "不支持的构建工具",
    unsupported_package_manager: "不支持的包管理工具",
    build_config_missing: "缺少构建配置",
    runtime_not_supported: "暂不支持该运行环境",
  };
  return labels[value] || value;
}

export function ProjectAssessmentPanel({ assessment }: ProjectAssessmentPanelProps) {
  const frontend = assessment.frameworks?.frontend || [];
  const backend = assessment.frameworks?.backend || [];
  const database = assessment.frameworks?.database || [];
  const envVars = assessment.environmentVariables?.required || [];
  const missing = assessment.support?.missingRequirements || [];
  const canPublish = Boolean(assessment.support?.canPublishNow);
  const details = [
    frontend.length ? `页面框架：${frontend.map((item) => item.label || item.code).join("、")}` : "",
    backend.length ? `后端能力：${backend.map((item) => item.label || item.code).join("、")}` : "",
    database.length ? `数据能力：${database.map((item) => item.label || item.code).join("、")}` : "",
    envVars.length ? `运行配置：需要 ${envVars.slice(0, 4).join("、")}${envVars.length > 4 ? " 等" : ""}` : ""
  ].filter(Boolean);

  return (
    <div className="project-profile-panel project-assessment-panel">
      <div>
        <strong>{assessment.projectKindLabel || "项目识别结果"}</strong>
        <span>{assessment.support?.nextAction || "DemoGo 已完成项目结构识别。"}</span>
      </div>
      <Badge tone={canPublish ? "success" : "warning"}>
        {canPublish ? "可以发布" : "先处理后发布"}
      </Badge>
      {details.length ? (
        <ul>
          {details.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {missing.length ? (
        <ul>
          {missing.slice(0, 4).map((item) => <li key={item}>{missingRequirementLabel(item)}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
