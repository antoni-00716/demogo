import os

base = r"C:\Users\wei.gu\Documents\demogo\web\src"

# FeedbackPanel.tsx - completely rewrite the Chinese portions
feedback_content = '''// DemoGo v0.9.14 - Feedback panel (extracted from UserDashboard)
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
      show("\u8bf7\u81f3\u5c11\u8f93\u5165 5 \u4e2a\u5b57\u7684\u53cd\u9988\u5185\u5bb9", "warning");
      return;
    }
    try {
      await createFeedback({ type, demoId, message: feedbackMessage });
      setFeedbackMessage("");
      show("\u53cd\u9988\u5df2\u63d0\u4ea4\uff0c\u611f\u8c22\u4f60\u7684\u5efa\u8bae\uff01", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "\u63d0\u4ea4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5", "danger");
    }
  }

  return (
    <Card className="panel" id="feedback">
      <h2>\u53cd\u9988\u95ee\u9898</h2>
      <div className="feedback-form">
        <label className="form-field">
          \u95ee\u9898\u7c7b\u578b
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="deploy_failed">\u53d1\u5e03\u5931\u8d25</option>
            <option value="form_data">\u8868\u5355\u6570\u636e</option>
            <option value="page_error">\u9875\u9762\u9519\u8bef</option>
            <option value="suggestion">\u529f\u80fd\u5efa\u8bae</option>
            <option value="other">\u5176\u4ed6</option>
          </select>
        </label>
        <label className="form-field">
          \u5173\u8054\u9879\u76ee
          <select className="select" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
            <option value="">\u4e0d\u5173\u8054\u9879\u76ee</option>
            {demos.map((demo) => <option key={demo.id} value={demo.id}>{demo.slug}</option>)}
          </select>
        </label>
        <label className="form-field">
          \u95ee\u9898\u63cf\u8ff0
          <textarea className="textarea" value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="\u8bf7\u8be6\u7ec6\u63cf\u8ff0\u4f60\u9047\u5230\u7684\u95ee\u9898\u6216\u5efa\u8bae" />
        </label>
        <Button onClick={submit}>\u63d0\u4ea4\u53cd\u9988</Button>
      </div>
    </Card>
  );
}
'''

filepath = os.path.join(base, r"components\dashboard\FeedbackPanel.tsx")
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(feedback_content)
print("FeedbackPanel.tsx: rewritten with correct Chinese")

# FormHostingPanel.tsx - fix the 3 broken places
fp = os.path.join(base, r"pages\dashboard\FormHostingPanel.tsx")
with open(fp, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<p>DemoGo ??????????????????????????</p>",
    "<p>DemoGo \u81ea\u52a8\u8bc6\u522b\u9879\u76ee\u4e2d\u7684\u8868\u5355\u5b57\u6bb5\uff0c\u5e2e\u4f60\u6536\u96c6\u7528\u6237\u4fe1\u606f\u3002</p>")
content = content.replace(
    "<p>??? {form.submissionCount || 0} ??? ? ??? {formatDate(form.createdAt)}</p>",
    "<p>\u5df2\u6536\u5230 {form.submissionCount || 0} \u6761\u63d0\u4ea4 \u00b7 {formatDate(form.createdAt)}</p>")
content = content.replace(
    '<Badge tone="success">??</Badge>',
    '<Badge tone="success">\u6536\u96c6\u4e2d</Badge>')

with open(fp, 'w', encoding='utf-8') as f:
    f.write(content)
print("FormHostingPanel.tsx: fixed 3 patterns")

# ProjectDetail.tsx - fix the 3 broken labels
fp = os.path.join(base, r"pages\dashboard\ProjectDetail.tsx")
with open(fp, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<dt>????</dt><dd>{demo.deploySourceLabel",
    "<dt>\u53d1\u5e03\u6765\u6e90</dt><dd>{demo.deploySourceLabel")
content = content.replace(
    "<dt>????</dt><dd>{demo.hostingModeLabel",
    "<dt>\u6258\u7ba1\u65b9\u5f0f</dt><dd>{demo.hostingModeLabel")
content = content.replace(
    "<dt>????</dt><dd>{demo.runtime?.statusLabel",
    "<dt>\u8fd0\u884c\u72b6\u6001</dt><dd>{demo.runtime?.statusLabel")

with open(fp, 'w', encoding='utf-8') as f:
    f.write(content)
print("ProjectDetail.tsx: fixed 3 labels")

print("\nAll done!")
