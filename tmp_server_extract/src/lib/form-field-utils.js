// DemoGo v0.9.3 - Form field utilities (extracted from inspection-builder.js and build-service.js)
export function isNonCollectableControl(text) {
  return /price|cost|fee|amount|total|rate|toggle|switch|slider|model|deepseek|gpt|claude|gemini|token|temperature|quantity|count|number|calculator|calc|预算|价格|费用|金额|总价|费率|模型|开关|数量|人数|计算/.test(String(text || "").toLowerCase());
}

export function isCollectableFormField(field) {
  const text = `${field?.name || ""} ${field?.label || ""}`.toLowerCase();
  if (isNonCollectableControl(text)) return false;
  return /name|姓名|phone|mobile|tel|手机号|电话|email|邮箱|company|公司|message|留言|remark|备注|contact|联系|wechat|微信|address|地址/.test(text);
}

export function filterAutoHostableFormFields(fields = []) {
  const sourceFields = Array.isArray(fields) ? fields : [];
  const names = sourceFields.map((field) => `${field.name || ""} ${field.label || ""}`.toLowerCase()).join(" ");
  const hasContact = /phone|mobile|tel|手机号|电话|email|邮箱|wechat|微信|contact|联系/.test(names);
  const hasMessage = /message|留言|remark|备注/.test(names);
  const hasIdentity = /name|姓名|company|公司/.test(names);
  if (!hasContact && !hasMessage && !hasIdentity) return [];
  return sourceFields
    .filter((field) => !isNonCollectableControl(`${field.name || ""} ${field.label || ""}`))
    .map((field) => ({ ...field, autoHostEligible: true }))
    .slice(0, 12);
}
