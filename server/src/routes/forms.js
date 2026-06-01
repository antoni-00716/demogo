import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir, publicBaseUrl } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import {
  calculateFormQuota,
  defaultFormFields,
  normalizeFormFields,
  normalizeFormStatus,
  publicForm,
  publicFormSubmission
} from "../services/form-service.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeAuditLog } from "../lib/audit-log.js";

const demosFile = pathJoin(dataDir, "demos.json");
const formsFile = pathJoin(dataDir, "forms.json");
const formSubmissionsFile = pathJoin(dataDir, "form-submissions.json");

export function registerFormsRoutes(app, { requireUser }) {
  app.get("/api/forms", requireUser, async (req, res, next) => {
    try {
      const [forms, submissions] = await Promise.all([
        readJson(formsFile, []),
        readJson(formSubmissionsFile, [])
      ]);
      const userForms = forms
        .filter((form) => form.userId === req.user.id && form.status !== "deleted")
        .map((form) => publicForm(form, { publicBaseUrl }));
      res.json({
        forms: userForms,
        quota: calculateFormQuota(req.user, forms, submissions)
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/forms", requireUser, async (req, res, next) => {
  try {
    const demoId = String(req.body?.demoId || "").trim();
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const requestedFields = normalizeFormFields(req.body?.fields || []);
    const [demos, forms, submissions] = await Promise.all([
      readJson(demosFile, []),
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const demo = demos.find((item) => item.id === demoId && item.userId === req.user.id);

    if (!demo) {
      res.status(404).json({ error: "未找到要开启报名/留言收集的试用项目" });
      return;
    }

    if (demo.status !== "published") {
      res.status(409).json({ error: "只有在线试用项目可以开启报名/留言收集" });
      return;
    }

    const existing = forms.find((form) => form.demoId === demo.id && form.userId === req.user.id && form.status !== "deleted");
    if (existing) {
      res.json({
        form: publicForm(existing, { publicBaseUrl }),
        quota: calculateFormQuota(req.user, forms, submissions)
      });
      return;
    }

    const quota = calculateFormQuota(req.user, forms, submissions);
    if (quota.forms.used >= quota.forms.limit) {
      res.status(403).json({ error: `当前套餐最多托管 ${quota.forms.limit} 个表单，请升级套餐或关闭其他表单后再试` });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userEmail: req.user.email,
      demoId: demo.id,
      demoSlug: demo.slug,
      demoName: demo.name || demo.slug,
      publicToken: crypto.randomBytes(24).toString("hex"),
      name: name || `${demo.name || demo.slug} 表单`,
      status: "active",
      fields: requestedFields.length
        ? requestedFields
        : (normalizeFormFields(demo.inspection?.formFields || []).length
            ? normalizeFormFields(demo.inspection?.formFields || [])
            : defaultFormFields()),
      submissionCount: 0,
      createdAt: now,
      updatedAt: now
    };

    forms.unshift(item);
    await writeJson(formsFile, forms.slice(0, 2000));
    await writeAuditLog({
      action: "create_form_hosting",
      actorType: "user",
      actorId: req.user.id,
      targetType: "form",
      targetId: item.id,
      ip: getClientIp(req),
      metadata: {
        demoId: demo.id,
        demoSlug: demo.slug
      }
    });

    res.json({
      form: publicForm(item, { publicBaseUrl }),
      quota: calculateFormQuota(req.user, forms, submissions)
    });
  } catch (error) {
    next(error);
  }
});
  app.get("/api/forms/:id", requireUser, async (req, res, next) => {
  try {
    const [forms, submissions] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const form = forms.find((item) => item.id === req.params.id && item.userId === req.user.id && item.status !== "deleted");
    if (!form) {
      res.status(404).json({ error: "未找到表单" });
      return;
    }
    res.json({
      form: publicForm(form, { publicBaseUrl }),
      submissions: submissions
        .filter((item) => item.formId === form.id && item.userId === req.user.id)
        .slice(0, 100)
        .map(publicFormSubmission)
    });
  } catch (error) {
    next(error);
  }
});
  app.post("/api/forms/:id/status", requireUser, async (req, res, next) => {
  try {
    const nextStatus = normalizeFormStatus(req.body?.status);
    if (!["active", "closed", "deleted"].includes(nextStatus)) {
      res.status(400).json({ error: "请选择有效的表单状态" });
      return;
    }

    const [forms, submissions] = await Promise.all([
      readJson(formsFile, []),
      readJson(formSubmissionsFile, [])
    ]);
    const formIndex = forms.findIndex((item) => item.id === req.params.id && item.userId === req.user.id);
    if (formIndex === -1) {
      res.status(404).json({ error: "未找到表单" });
      return;
    }

    forms[formIndex] = {
      ...forms[formIndex],
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    await writeJson(formsFile, forms);
    await writeAuditLog({
      action: "update_form_status",
      actorType: "user",
      actorId: req.user.id,
      targetType: "form",
      targetId: forms[formIndex].id,
      ip: getClientIp(req),
      metadata: {
        status: nextStatus,
        demoSlug: forms[formIndex].demoSlug
      }
    });

    res.json({
      form: publicForm(forms[formIndex], { publicBaseUrl }),
      quota: calculateFormQuota(req.user, forms, submissions)
    });
  } catch (error) {
    next(error);
  }
});
}