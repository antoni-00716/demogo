import { useState } from "react";

export function PreviewPage() {
  const [feedbackType, setFeedbackType] = useState("praise");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!feedbackText.trim()) return;
    setSubmitted(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "var(--font-sans)", background: "var(--bg-section)", color: "var(--text-primary)", WebkitFontSmoothing: "antialiased" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        background: "rgba(255,255,255,.88)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", textDecoration: "none" }}>
            <span style={{ color: "var(--accent)", fontSize: 17 }}>◆</span>DemoGo
          </a>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, background: "rgba(34,197,94,.1)", color: "var(--accent)", fontWeight: 500 }}>试用演示</span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>/ 产品落地页 v2 · 李婷</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "var(--accent)" }}>●</span> 剩余 23 小时</span>
          <button style={{ padding: "7px 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", background: "var(--bg)", fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>
            📋 复制链接
          </button>
          <button style={{ padding: "7px 16px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            💬 提供反馈
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", overflow: "auto" }}>
        <div style={{ width: "100%", maxWidth: 860 }}>
          {/* Preview Area */}
          <div style={{
            width: "100%", aspectRatio: "16/10",
            background: "var(--bg)", borderRadius: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,.08)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 48, opacity: 0.2 }}>🖥️</div>
            <div style={{ fontSize: 15, color: "var(--text-tertiary)", fontWeight: 500 }}>你的项目正在这里运行</div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>产品落地页 v2 · 实时演示</div>
          </div>

          {/* Feedback Form */}
          {!submitted ? (
            <div style={{
              maxWidth: 500, margin: "0 auto",
              background: "var(--bg)", borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)", border: "1px solid var(--border-light)",
              padding: 36,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>留下你的反馈</h3>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>你的意见将直接发送给作品创建者</p>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[
                  { value: "praise", label: "👍 很赞" },
                  { value: "suggestion", label: "💡 建议" },
                  { value: "bug", label: "🐛 Bug" },
                  { value: "question", label: "❓ 问题" },
                ].map((opt) => (
                  <label key={opt.value} style={{
                    flex: 1, textAlign: "center", padding: 8,
                    border: `1px solid ${feedbackType === opt.value ? "var(--accent-border)" : "var(--border)"}`,
                    borderRadius: 12, cursor: "pointer",
                    fontSize: 13, color: feedbackType === opt.value ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: feedbackType === opt.value ? 500 : 400,
                    background: feedbackType === opt.value ? "var(--accent-subtle)" : "transparent",
                  }}>
                    <input type="radio" name="fb" style={{ display: "none" }} checked={feedbackType === opt.value} onChange={() => setFeedbackType(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>

              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="说说你的感受..."
                style={{
                  width: "100%", padding: "12px 16px", border: "1px solid var(--border-light)",
                  borderRadius: 14, fontSize: 14, minHeight: 80, resize: "vertical",
                  outline: "none", marginBottom: 14, fontFamily: "var(--font-sans)",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-light)"}
              />

              <button
                onClick={handleSubmit}
                disabled={!feedbackText.trim()}
                style={{
                  width: "100%", padding: 12, borderRadius: "var(--radius-pill)",
                  background: feedbackText.trim() ? "var(--accent)" : "var(--border)",
                  color: feedbackText.trim() ? "#fff" : "var(--text-quaternary)",
                  border: "none", fontSize: 14, fontWeight: 600, cursor: feedbackText.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-sans)",
                }}
              >
                发送反馈
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--text-quaternary)" }}>
                <span>已收集 15 条反馈</span>
                <span>DemoGo 提供技术支持</span>
              </div>
            </div>
          ) : (
            <div style={{
              maxWidth: 500, margin: "0 auto",
              background: "var(--bg)", borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)", border: "1px solid var(--border-light)",
              padding: 48,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>感谢你的反馈！</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>你的意见已发送给作品创建者</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
