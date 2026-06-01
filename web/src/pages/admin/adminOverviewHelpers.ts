export function failureReasonNote(reasons?: Record<string, number>) {
  if (!reasons) return "暂无失败";
  const entries = [
    ["内容", reasons.content || 0],
    ["额度", reasons.quota || 0],
    ["暂不支持", reasons.unsupported || 0],
    ["构建", reasons.build || 0]
  ].filter(([, count]) => Number(count) > 0);
  if (!entries.length) return "暂无失败";
  return entries.slice(0, 2).map(([label, count]) => `${label}${count}`).join(" / ");
}
