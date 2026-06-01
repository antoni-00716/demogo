export function stackItemText(items?: Array<{ label?: string; code?: string }>) {
  const values = (items || []).map((item) => item.label || item.code).filter(Boolean);
  return values.length ? values.join("、") : "";
}

export function missingRequirementLabel(value: string) {
  const labels: Record<string, string> = {
    missing_build_script: "缺少网页生成命令",
    missing_start_script: "缺少应用启动命令",
    ssr_runtime_planned: "需要完整应用运行能力",
    external_backend_config: "需要外部后端配置",
    unsupported_database: "数据库连接能力还不完整",
    environment_variables: "需要补充运行配置",
    unsupported_runtime: "运行环境暂不支持"
  };
  return labels[value] || value;
}
