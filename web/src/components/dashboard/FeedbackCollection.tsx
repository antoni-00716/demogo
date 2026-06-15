import { useState } from "react";

const DEMO_FEEDBACKS = [
  { id: "1", unread: true, project: "产品落地页 v2", type: "suggestion", text: "CTA 按钮的颜色跟品牌色调不太搭，建议改成蓝色系，可能会更好引导转化。", date: "10 分钟前" },
  { id: "2", unread: true, project: "App 引导页动画", type: "praise", text: "这个引导动画做得太棒了！交互很流畅，设计也很精致 👍", date: "1 小时前" },
  { id: "3", unread: false, project: "用户调研原型", type: "bug", text: "表单提交按钮在移动端点击无响应，iPhone 13 上测试的，麻烦修复一下。", date: "昨天 15:42" },
  { id: "4", unread: false, project: "电商活动页", type: "suggestion", text: "建议在价格旁边加一个\"省 ¥XXX\"的标签，能提升购买欲望。", date: "3 天前" },
  { id: "5", unread: false, project: "产品落地页 v2", type: "praise", text: "内容结构很清晰，加载速度也很快，专业水平！", date: "5 天前" },
  { id: "6", unread: false, project: "品牌展示页", type: "bug", text: "页面在 Safari 浏览器上排版错乱，图片显示不全，请检查兼容性。", date: "1 周前" },
];

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "suggestion", label: "建议" },
  { key: "bug", label: "问题" },
  { key: "praise", label: "赞赏" },
];

const BADGE_LABELS: Record<string, { label: string; cls: string }> = {
  suggestion: { label: "建议", cls: "feedback-badge--suggestion" },
  bug: { label: "问题", cls: "feedback-badge--bug" },
  praise: { label: "赞赏", cls: "feedback-badge--praise" },
};

export function FeedbackCollection() {
  const [activeFilter, setActiveFilter] = useState("all");

  const sorted = [...DEMO_FEEDBACKS].sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1));
  const filtered = activeFilter === "all"
    ? sorted
    : activeFilter === "unread"
      ? sorted.filter((f) => f.unread)
      : sorted.filter((f) => f.type === activeFilter);

  return (
    <div>
      <div className="feedback-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-btn${activeFilter === f.key ? " active" : ""}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="feedback-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((fb) => {
          const badge = BADGE_LABELS[fb.type] || BADGE_LABELS.suggestion;
          return (
            <div key={fb.id} className={`feedback-item${fb.unread ? " feedback-item--unread" : ""}`}>
              <div className="feedback-body">
                <div className="feedback-top">
                  <span className="feedback-project">{fb.project}</span>
                  <span className={`feedback-badge ${badge.cls}`}>{badge.label}</span>
                  {fb.unread && <span className="unread-dot" aria-label="未读"></span>}
                </div>
                <div className="feedback-text">{fb.text}</div>
                <div className="feedback-date">{fb.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
