import crypto from "node:crypto";
import { join as pathJoin } from "node:path";
import { dataDir, publicBaseUrl } from "../config.js";
import { readJson, writeJson } from "../lib/data-access.js";
import { getClientIp } from "../lib/request-utils.js";
import { writeAuditLog } from "../lib/audit-log.js";
import {
  calculateFormQuota, normalizeFormFields, normalizeFormStatus,
  publicForm, publicFormSubmission, sanitizeSubmissionPayload, defaultFormFields
} from "../services/form-service.js";

const demosFile = pathJoin(dataDir, "demos.json");
const formsFile = pathJoin(dataDir, "forms.json");
const formSubmissionsFile = pathJoin(dataDir, "form-submissions.json");

export function registerFormRoutes(app, deps = {}) {
  const { requireUser } = deps;

app.get("/api/forms", requireUser, async (req, res, next) => {
  try {
    const forms = await readJson(formsFile, []);
    const mine = forms.filter(f => f.userId === req.user.id && f.status !== "deleted");
    res.json({ forms: mine.slice(0, 50).map(f => publicForm(f, { publicBaseUrl })), quota: calculateFormQuota(req.user, mine) });
  } catch (error) { next(error); }
});

app.post("/api/forms", requireUser, async (req, res, next) => {
  try {
    const demoId = String(req.body?.demoId || "").trim();
    const fieldDefs = normalizeFormFields(req.body?.fields || defaultFormFields);
    if (!demoId) { res.status(400).json({ error: "请指定关联的试用项目" }); return; }
    const demos = await readJson(demosFile, []);
    const demo = demos.find(d => d.id === demoId && d.userId === req.user.id);
    if (!demo) { res.status(404).json({ error: "未找到该试用项目" }); return; }
    const forms = await readJson(formsFile, []);
    const quota = calculateFormQuota(req.user, forms.filter(f => f.userId === req.user.id));
    if (quota.remaining <= 0) { res.status(403).json({ error: "表单数量已达上限" }); return; }
    const existing = forms.find(f => f.demoId === demoId && f.userId === req.user.id && f.status !== "deleted");
    if (existing) { res.json({ form: publicForm(existing, { publicBaseUrl }) }); return; }
    const now = new Date().toISOString();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const item = {
      id: crypto.randomUUID(), userId: req.user.id, userEmail: req.user.email,
      demoId: demo.id, demoSlug: demo.slug, publicToken: token, fields: fieldDefs,
      status: "active", publicUrl: publicBaseUrl.replace(/\/$/, "") + "/f/" + token,
      createdAt: now, updatedAt: now
    };
    forms.unshift(item);
    await writeJson(formsFile, forms.slice(0, 2000));
    await writeAuditLog({
      action: "create_form", actorType: "user", actorId: req.user.id,
      targetType: "form", targetId: item.id, ip: getClientIp(req),
      metadata: { demoId: item.demoId, demoSlug: item.demoSlug, fieldCount: fieldDefs.length }
    });
    res.json({ form: publicForm(item, { publicBaseUrl }) });
  } catch (error) { next(error); }
});

app.get("/api/forms/:id", requireUser, async (req, res, next) => {
  try {
    const forms = await readJson(formsFile, []);
    const form = forms.find(f => f.id === req.params.id && f.userId === req.user.id);
    if (!form) { res.status(404).json({ error: "未找到该表单" }); return; }
    const submissions = await readJson(formSubmissionsFile, []);
    res.json({
      form: publicForm(form, { publicBaseUrl }),
      submissions: submissions.filter(s => s.formId === form.id).slice(0, 200).map(publicFormSubmission)
    });
  } catch (error) { next(error); }
});

app.post("/api/forms/:id/status", requireUser, async (req, res, next) => {
  try {
    const newStatus = normalizeFormStatus(req.body?.status);
    if (!newStatus) { res.status(400).json({ error: "无效状态" }); return; }
    const forms = await readJson(formsFile, []);
    const idx = forms.findIndex(f => f.id === req.params.id && f.userId === req.user.id);
    if (idx === -1) { res.status(404).json({ error: "未找到该表单" }); return; }
    forms[idx] = { ...forms[idx], status: newStatus, updatedAt: new Date().toISOString() };
    await writeJson(formsFile, forms);
    await writeAuditLog({
      action: "update_form_status", actorType: "user", actorId: req.user.id,
      targetType: "form", targetId: forms[idx].id, ip: getClientIp(req),
      metadata: { status: newStatus }
    });
    res.json({ form: publicForm(forms[idx]) });
  } catch (error) { next(error); }
});

app.post("/api/public/forms/:token/submit", async (req, res, next) => {
  try {
    const forms = await readJson(formsFile, []);
    const form = forms.find(f => (f.publicToken || f.token) === req.params.token && f.status === "active");
    if (!form) { res.status(404).json({ error: "表单不存在或已关闭" }); return; }
    const payload = sanitizeSubmissionPayload(req.body || {}, form.fields);
    const submissions = await readJson(formSubmissionsFile, []);
    const now = new Date().toISOString();
    const sub = {
      id: crypto.randomUUID(), formId: form.id, demoId: form.demoId,
      payload: payload, ip: getClientIp(req), createdAt: now
    };
    submissions.unshift(sub);
    await writeJson(formSubmissionsFile, submissions.slice(0, 5000));
    res.json({ ok: true });
  } catch (error) { next(error); }
});

}