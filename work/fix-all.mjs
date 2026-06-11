import { readFileSync, writeFileSync } from "fs";
function h(s) { return Buffer.from(s, "hex").toString("utf8"); }

// FeedbackPanel.tsx
let c = readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", "utf8");
c = c.replace("          ????\r\n          <select className=\"select\" value={type}", "          " + h("e997aee9a298e7b1bbe59e8b") + "\r\n          <select className=\"select\" value={type}");
c = c.replace("          ????\r\n          <select className=\"select\" value={demoId}", "          " + h("e585b3e88194e9a1b9e79bae") + "\r\n          <select className=\"select\" value={demoId}");
c = c.replace("          ????\r\n          <textarea className=\"textarea\"", "          " + h("e997aee9a298e68f8fe8bfb0") + "\r\n          <textarea className=\"textarea\"");
writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/components/dashboard/FeedbackPanel.tsx", c, "utf8");

// FormHostingPanel.tsx
c = readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/FormHostingPanel.tsx", "utf8");
c = c.replace("<p>DemoGo ??????????????????????????</p>", "<p>" + h("44656d6f476f20e887aae58aa8e8af86e588abe9a1b9e79baee4b8ade79a84e8a1a8e58d95e5ad97e6aeb5efbc8ce5b8aee4bda0e694b6e99b86e794a8e688b7e4bfa1e681afe38082") + "</p>");
c = c.replace("<p>??? {form.submissionCount || 0} ??? ? ??? {formatDate(form.createdAt)}</p>", "<p>" + h("e5b7b2e694b6e588b020") + "{form.submissionCount || 0} " + h("e69da1e68f90e4baa420c2b720") + "{formatDate(form.createdAt)}</p>");
c = c.replace("<Badge tone=\"success\">??</Badge>", "<Badge tone=\"success\">" + h("e694b6e99b86e4b8ad") + "</Badge>");
writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/FormHostingPanel.tsx", c, "utf8");

// ProjectDetail.tsx
c = readFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/ProjectDetail.tsx", "utf8");
c = c.replace("<dt>????</dt><dd>{demo.deploySourceLabel", "<dt>" + h("e58f91e5b883e69da5e6ba90") + "</dt><dd>{demo.deploySourceLabel");
c = c.replace("<dt>????</dt><dd>{demo.hostingModeLabel", "<dt>" + h("e68998e7aea1e696b9e5bc8f") + "</dt><dd>{demo.hostingModeLabel");
c = c.replace("<dt>????</dt><dd>{demo.runtime?.statusLabel", "<dt>" + h("e8bf90e8a18ce78ab6e68081") + "</dt><dd>{demo.runtime?.statusLabel");
writeFileSync("C:/Users/wei.gu/Documents/demogo/web/src/pages/dashboard/ProjectDetail.tsx", c, "utf8");

console.log("All 3 files fixed.");
