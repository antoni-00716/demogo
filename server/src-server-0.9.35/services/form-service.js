import { plans } from "../config.js";

export function normalizeFormFields(fields = []) {
  const result = [];
  const seen = new Set();

  for (const rawField of Array.isArray(fields) ? fields : []) {
    const name = normalizeFieldName(rawField?.name || rawField?.label || "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push({
      name,
      label: String(rawField?.label || rawField?.name || name).trim().slice(0, 60),
      type: normalizeFieldType(rawField?.type),
      required: Boolean(rawField?.required),
      autoHostEligible: rawField?.autoHostEligible === undefined ? undefined : Boolean(rawField.autoHostEligible)
    });
  }

  return result.slice(0, 30);
}

export function defaultFormFields() {
  return [
    { name: "name", label: "姓名", type: "text", required: true },
    { name: "phone", label: "手机号", type: "phone", required: true },
    { name: "message", label: "留言", type: "textarea", required: false }
  ];
}

export function publicForm(form, options = {}) {
  return {
    id: form.id,
    userId: form.userId,
    userEmail: form.userEmail,
    demoId: form.demoId,
    demoSlug: form.demoSlug,
    demoName: form.demoName,
    name: form.name,
    status: form.status || "active",
    fields: normalizeFormFields(form.fields || []),
    submissionCount: Number(form.submissionCount || 0),
    submitUrl: options.publicBaseUrl && form.publicToken
      ? `${String(options.publicBaseUrl).replace(/\/$/, "")}/api/public/forms/${form.publicToken}/submit`
      : undefined,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt
  };
}

export function publicFormSubmission(submission) {
  return {
    id: submission.id,
    formId: submission.formId,
    demoId: submission.demoId,
    demoSlug: submission.demoSlug,
    payload: sanitizeSubmissionPayload(submission.payload || {}),
    createdAt: submission.createdAt
  };
}

export function filterAdminForms(forms = [], filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const status = String(filters.status || "").trim().toLowerCase();

  return forms.filter((form) => {
    if (status && String(form.status || "active") !== status) return false;
    if (!search) return true;
    return [
      form.name,
      form.userEmail,
      form.demoSlug,
      form.demoName
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
}

export function calculateFormQuota(user, forms = [], submissions = []) {
  const plan = plans[user?.plan || "free"] || plans.free;
  const userForms = forms.filter((form) => form.userId === user.id && form.status !== "deleted");
  const activeForms = userForms.filter((form) => (form.status || "active") === "active");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthSubmissions = submissions.filter((submission) => (
    submission.userId === user.id && new Date(submission.createdAt || 0) >= monthStart
  )).length;

  return {
    forms: {
      used: activeForms.length,
      limit: Number(plan.maxForms || 0)
    },
    monthlySubmissions: {
      used: monthSubmissions,
      limit: Number(plan.maxFormSubmissions || 0)
    }
  };
}

export function sanitizeSubmissionPayload(payload = {}, fields = []) {
  const result = {};
  const allowedFields = normalizeFormFields(fields);
  const source = payload && typeof payload === "object" ? payload : {};
  const keys = allowedFields.length
    ? allowedFields.map((field) => field.name)
    : Object.keys(source).slice(0, 30);

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = source[key];
    result[key] = Array.isArray(value)
      ? value.map((item) => sanitizeFieldValue(item)).join(", ")
      : sanitizeFieldValue(value);
  }

  return result;
}

export function normalizeFormStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["active", "closed", "deleted"].includes(status) ? status : "";
}

function normalizeFieldName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function normalizeFieldType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (["text", "phone", "email", "number", "textarea", "select", "date"].includes(type)) return type;
  if (type.includes("tel")) return "phone";
  if (type.includes("mail")) return "email";
  return "text";
}

function sanitizeFieldValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, 2000);
}
