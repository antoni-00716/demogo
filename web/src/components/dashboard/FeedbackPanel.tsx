// DemoGo v0.9.14 - Feedback panel (extracted from UserDashboard)
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
      show("????? 5 ????????", "warning");
      return;
    }
    try {
      await createFeedback({ type, demoId, message: feedbackMessage });
      setFeedbackMessage("");
      show("????????????????????????", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "???????", "danger");
    }
  }

  return (
    <Card className="panel" id="feedback">
      <h2>????</h2>
      <div className="feedback-form">
        <label className="form-field">
          ????
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="deploy_failed">??????</option>
            <option value="form_data">????</option>
            <option value="page_error">?????</option>
            <option value="suggestion">????</option>
            <option value="other">????</option>
          </select>
        </label>
        <label className="form-field">
          ??????
          <select className="select" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
            <option value="">???????</option>
            {demos.map((demo) => <option key={demo.id} value={demo.id}>{demo.slug}</option>)}
          </select>
        </label>
        <label className="form-field">
          ????
          <textarea className="textarea" value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="????????????" />
        </label>
        <Button onClick={submit}>????</Button>
      </div>
    </Card>
  );
}
