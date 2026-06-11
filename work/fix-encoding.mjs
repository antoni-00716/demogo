import fs from "fs";

// Fix FeedbackPanel.tsx
let content = fs.readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", "utf8");
content = content.replace('          ????\n          <select className="select" value={type}', '          问题类型\n          <select className="select" value={type}');
content = content.replace('          ????\n          <select className="select" value={demoId}', '          关联项目\n          <select className="select" value={demoId}');
content = content.replace('          ????\n          <textarea className="textarea"', '          问题描述\n          <textarea className="textarea"');
fs.writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", content, "utf8");
console.log("FeedbackPanel.tsx done");

// Fix FormHostingPanel.tsx
content = fs.readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/FormHostingPanel.tsx", "utf8");
content = content.replace("<p>DemoGo ??????????????????????????</p>", "<p>DemoGo 自动识别项目中的表单字段，帮你收集用户信息。</p>");
content = content.replace("<p>??? {form.submissionCount || 0} ??? ? ??? {formatDate(form.createdAt)}</p>", "<p>已收到 {form.submissionCount || 0} 条提交 · {formatDate(form.createdAt)}</p>");
content = content.replace('<Badge tone="success">??</Badge>', '<Badge tone="success">收集中</Badge>');
fs.writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/FormHostingPanel.tsx", content, "utf8");
console.log("FormHostingPanel.tsx done");

// Fix ProjectDetail.tsx
content = fs.readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/ProjectDetail.tsx", "utf8");
content = content.replace("<dt>????</dt><dd>{demo.deploySourceLabel", "<dt>发布来源</dt><dd>{demo.deploySourceLabel");
content = content.replace("<dt>????</dt><dd>{demo.hostingModeLabel", "<dt>托管方式</dt><dd>{demo.hostingModeLabel");
content = content.replace("<dt>????</dt><dd>{demo.runtime?.statusLabel", "<dt>运行状态</dt><dd>{demo.runtime?.statusLabel");
fs.writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/ProjectDetail.tsx", content, "utf8");
console.log("ProjectDetail.tsx done");

console.log("All 3 files fixed.");
