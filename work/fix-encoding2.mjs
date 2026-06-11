import fs from "fs";

// Fix FeedbackPanel.tsx
let content = fs.readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", "utf8");

// The file uses CRLF (Windows line endings), so we need \r\n
content = content.replace("          ????\r\n          <select className=\"select\" value={type}", "          问题类型\r\n          <select className=\"select\" value={type}");
content = content.replace("          ????\r\n          <select className=\"select\" value={demoId}", "          关联项目\r\n          <select className=\"select\" value={demoId}");
content = content.replace("          ????\r\n          <textarea className=\"textarea\"", "          问题描述\r\n          <textarea className=\"textarea\"");

fs.writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", content, "utf8");
console.log("FeedbackPanel.tsx done");

// Verify
const verify = fs.readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", "utf8");
const remaining = verify.match(/\?\?\?\?/g);
console.log("Remaining ????:", remaining ? remaining.length : 0);
const lines = verify.split("\n");
console.log("L35:", lines[34].trim());
console.log("L45:", lines[44].trim());
console.log("L52:", lines[51].trim());
