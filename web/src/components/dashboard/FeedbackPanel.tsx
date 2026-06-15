// DemoGo v0.9.14 - Feedback panel (iOS redesign)
import { useState } from "react";
import { Card } from "../Card";
import { Button } from "../Button";
import { createFeedback } from "../../api/feedback";
import type { Demo } from "../../types";

export function FeedbackPanel({ demos, show }: {
  demos: Demo[];
  show: (text: string, tone?: "info" | "success" | "warning" | "danger") => void;
}) {
  const [type, setType] = useState("suggestion");
  const [demoId, setDemoId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  async function submit() {
    if (feedbackMessage.trim().length < 5) {
      show("请至少输入 5 个字的反馈内容", "warning");
      return;
    }
    try {
      await createFeedback({ type, demoId, message: feedbackMessage });
      setFeedbackMessage("");
      show("反馈已提交，感谢你的建议！", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "提交失败，请稍后重试", "danger");
    }
  }

  return (
    <div>
      <div className="feedback-filters" style={{ marginBottom: 20 }}>
        <button className={`filter-btn ${type === "suggestion" ? "active" : ""}`} onClick={() => setType("suggestion")}>建议</button>
        <button className={`filter-btn ${type === "bug" ? "active" : ""}`} onClick={() => setType("bug")}>问题</button>
        <button className={`filter-btn ${type === "praise" ? "active" : ""}`} onClick={() => setType("praise")}>赞赏</button>
        <button className={`filter-btn ${type === "other" ? "active" : ""}`} onClick={() => setType("other")}>其他</button>
      </div>

      <Card className="panel" id="feedback">
        <h2>反馈问题</h2>
        <div className="feedback-form">
          <label className="form-field">
            关联项目
            <select className="select" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
              <option value="">不关联项目</option>
              {demos.map((demo) => <option key={demo.id} value={demo.id}>{demo.slug}</option>)}
            </select>
          </label>
          <label className="form-field">
            问题描述
            <textarea className="textarea" value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="请详细描述你遇到的问题或建议" />
          </label>
          <Button onClick={submit}>提交反馈</Button>
        </div>
      </Card>
    </div>
  );
}
