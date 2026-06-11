// DemoGo v0.9.5 - Input validation helpers

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export function validateEmail(value) {
  if (!value || typeof value !== "string") return "请输入邮箱地址";
  if (!EMAIL_RE.test(value.trim())) return "邮箱格式不正确";
  return null;
}

export function validatePassword(value) {
  if (!value || typeof value !== "string") return "请输入密码";
  if (value.length < 8) return "密码至少需要8位";
  if (value.length > 128) return "密码不能超过128位";
  return null;
}

export function validateSlug(value) {
  if (!value || typeof value !== "string") return "请输入链接后缀";
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 3) return "链接后缀至少需要3个字符";
  if (trimmed.length > 40) return "链接后缀不能超过40个字符";
  if (!SLUG_RE.test(trimmed)) return "链接后缀只能包含小写字母、数字和连字符";
  return null;
}

export function validateProjectName(value) {
  if (value && typeof value === "string" && value.length > 100) return "项目名称不能超过100个字符";
  return null;
}

export function validateRequired(value, label) {
  if (!value || (typeof value === "string" && !value.trim())) return "请填写" + label;
  return null;
}

// Apply validations and return first error, or null
export function validate(input, rules) {
  for (const [field, validators] of Object.entries(rules)) {
    const val = input[field];
    for (const fn of validators) {
      const err = fn(val);
      if (err) return err;
    }
  }
  return null;
}
