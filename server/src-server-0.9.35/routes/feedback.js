// Refactored feedback.js - direct imports for services/lib, deps only for middleware
import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { normalizeFeedbackType, publicFeedback } from "../services/feedback-service.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeAuditLog } from "../lib/audit-log.js";

const demosFile = pathJoin(dataDir, "demos.json");
const feedbackFile = pathJoin(dataDir, "feedback.json");

export function registerFeedbackRoutes(app, { requireUser }) {
  app.post("/api/feedback", requireUser, async (req, res, next) => {
    try {
      const message = String(req.body?.message || "").trim();
      const type = normalizeFeedbackType(req.body?.type);
      const demoId = String(req.body?.demoId || "").trim();
      const contact = String(req.body?.contact || "").trim();

      if (message.length < 5) {
        res.status(400).json({ error: "请至少填写 5 个字的问题描述" });
        return;
      }

      if (message.length > 1000) {
        res.status(400).json({ error: "问题描述过长，请控制在 1000 字以内" });
        return;
      }

      const demos = await readJson(demosFile, []);
      const relatedDemo = demoId ? demos.find((demo) => demo.id === demoId && demo.userId === req.user.id) : null;
      if (demoId && !relatedDemo) {
        res.status(404).json({ error: "未找到关联 Demo" });
        return;
      }

      const feedback = await readJson(feedbackFile, []);
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        userId: req.user.id,
        userEmail: req.user.email,
        demoId: relatedDemo?.id || null,
        demoSlug: relatedDemo?.slug || null,
        type,
        message,
        contact: contact.slice(0, 120),
        status: "open",
        ip: getClientIp(req),
        createdAt: now,
        updatedAt: now
      };

      feedback.unshift(item);
      await writeJson(feedbackFile, feedback.slice(0, 2000));
      await writeAuditLog({
        action: "submit_feedback",
        actorType: "user",
        actorId: req.user.id,
        targetType: "feedback",
        targetId: item.id,
        ip: item.ip,
        metadata: {
          type,
          demoId: item.demoId,
          demoSlug: item.demoSlug
        }
      });

      res.json({ feedback: publicFeedback(item) });
    } catch (error) {
      next(error);
    }
  });
}