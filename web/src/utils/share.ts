export function createShareText(name: string, url: string) {
  return [
    "我用 DemoGo 生成了一个可以在线打开的试用链接：",
    "",
    `【${name || "试用项目"}】`,
    `访问链接：${url}`,
    "",
    "你可以直接打开体验页面效果。如果有打不开、显示异常或需要调整的地方，请反馈给我。",
    "",
    "这个链接由 DemoGo 生成。DemoGo 用来把 AI 工具生成的网页和产品原型快速变成可分享的试用链接，方便演示、测试和收集反馈。"
  ].join("\n");
}

export async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to textarea fallback.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
