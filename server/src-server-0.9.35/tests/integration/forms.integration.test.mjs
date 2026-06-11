import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  setupTestEnvironment,
  startServer,
  waitForServer,
  testConfig,
  registerAndLogin,
  createZipFromFiles,
  deployProject,
  getForms,
  getForm,
  getFormSubmissions,
  getText,
  assertEqual,
  assertContains,
  assertHasProperty,
  assertIsArray,
  assertGreaterOrEqual,
  sleep,
} from "./helpers.mjs";

describe("表单托管集成测试", () => {
  let server;
  let user;
  let testDemo;

  before(async () => {
    await setupTestEnvironment();
    server = startServer();
    await waitForServer(testConfig.baseUrl);
    user = await registerAndLogin();

    const zipPath = await createZipFromFiles({
      "index.html": `<!doctype html>
<html>
<head><title>表单测试</title></head>
<body>
  <h1>联系我们</h1>
  <form id="contact-form">
    <input type="text" name="name" placeholder="姓名" required>
    <input type="email" name="email" placeholder="邮箱" required>
    <input type="tel" name="phone" placeholder="电话">
    <textarea name="message" placeholder="留言内容" required></textarea>
    <button type="submit">提交</button>
  </form>
  <script>
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      alert('提交成功！');
    });
  </script>
</body>
</html>`,
    });

    const result = await deployProject(zipPath, { name: "表单测试项目" }, user.cookie);
    testDemo = result.data;
  });

  after(async () => {
    if (server) {
      server.kill();
      await sleep(500);
    }
  });

  describe("表单自动检测", () => {
    it("应该能够检测到表单字段", async () => {
      const demo = await fetch(`${testConfig.baseUrl}/api/demos/${testDemo.id}`, {
        headers: { Cookie: user.cookie },
      });

      const data = await demo.json();
      assert(data.demo, "应该返回demo数据");
      assert(
        data.demo.inspection?.forms?.formFields || data.demo.architecture?.formFields,
        "应该包含表单字段信息"
      );
    });

    it("应该正确识别表单字段类型", async () => {
      const demo = await fetch(`${testConfig.baseUrl}/api/demos/${testDemo.id}`, {
        headers: { Cookie: user.cookie },
      });

      const data = await demo.json();
      const formFields = data.demo.inspection?.forms?.formFields || data.demo.architecture?.formFields || [];

      const nameField = formFields.find((f) => f.name === "name");
      const emailField = formFields.find((f) => f.name === "email");
      const messageField = formFields.find((f) => f.name === "message");

      assert(nameField, "应该检测到name字段");
      assert(emailField, "应该检测到email字段");
      assert(messageField, "应该检测到message字段");
    });
  });

  describe("表单列表", () => {
    it("应该能够获取用户的表单列表", async () => {
      const result = await getForms(user.cookie);
      assertIsArray(result.forms, "应该返回forms数组");
    });

    it("应该能够获取特定表单详情", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const formId = forms.forms[0].id;
        const form = await getForm(formId, user.cookie);
        assertHasProperty(form, "form", "应该返回表单详情");
        assertEqual(form.form.id, formId, "应该返回正确的表单ID");
      }
    });
  });

  describe("表单提交", () => {
    it("应该能够提交表单数据", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const formId = forms.forms[0].id;
        const publicToken = forms.forms[0].publicToken;

        const submitResult = await fetch(`${testConfig.baseUrl}/api/forms/${publicToken}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "张三",
            email: "zhangsan@example.com",
            phone: "13800138000",
            message: "这是一条测试留言",
          }),
        });

        const data = await submitResult.json();
        assertEqual(submitResult.status, 200, "提交应该返回200状态码");
        assert(data.ok === true, "应该返回ok=true");
      }
    });

    it("应该能够获取表单提交记录", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const formId = forms.forms[0].id;
        const submissions = await getFormSubmissions(formId, user.cookie);

        assertIsArray(submissions.submissions, "应该返回submissions数组");
      }
    });

    it("应该能够处理多次提交", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const publicToken = forms.forms[0].publicToken;

        for (let i = 0; i < 3; i++) {
          await fetch(`${testConfig.baseUrl}/api/forms/${publicToken}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `用户${i}`,
              email: `user${i}@example.com`,
              message: `第${i + 1}次提交`,
            }),
          });
        }

        const submissions = await getFormSubmissions(forms.forms[0].id, user.cookie);
        assertGreaterOrEqual(submissions.submissions.length, 3, "应该至少有3条提交记录");
      }
    });

    it("应该正确验证必填字段", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const publicToken = forms.forms[0].publicToken;

        const result = await fetch(`${testConfig.baseUrl}/api/forms/${publicToken}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            email: "",
            message: "",
          }),
        });

        const data = await result.json();
        assert(result.status === 400 || data.error, "缺少必填字段应该返回错误");
      }
    });

    it("应该正确验证邮箱格式", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const publicToken = forms.forms[0].publicToken;

        const result = await fetch(`${testConfig.baseUrl}/api/forms/${publicToken}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "测试",
            email: "invalid-email",
            message: "测试留言",
          }),
        });

        const data = await result.json();
        assert.ok(result.status === 400 || data.error, "无效邮箱应该返回错误");
      }
    });
  });

  describe("表单公开访问", () => {
    it("应该能够通过publicToken访问表单", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const publicToken = forms.forms[0].publicToken;
        const page = await getText(`/api/forms/${publicToken}/embed`);

        assertContains(page, "<form", "应该包含表单HTML");
      }
    });

    it("无效的publicToken应该返回错误", async () => {
      const result = await fetch(`${testConfig.baseUrl}/api/forms/invalid-token/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "测试",
          email: "test@example.com",
          message: "测试",
        }),
      });

      assertEqual(result.status, 404, "无效token应该返回404");
    });
  });

  describe("表单数据导出", () => {
    it("应该能够导出表单数据", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const formId = forms.forms[0].id;
        const result = await fetch(`${testConfig.baseUrl}/api/forms/${formId}/export`, {
          headers: { Cookie: user.cookie },
        });

        assertEqual(result.status, 200, "导出应该返回200状态码");
        const contentType = result.headers.get("content-type");
        assert(
          contentType.includes("text/csv") || contentType.includes("application/json"),
          "应该返回CSV或JSON格式"
        );
      }
    });
  });

  describe("表单统计", () => {
    it("应该能够获取表单提交统计", async () => {
      const forms = await getForms(user.cookie);
      if (forms.forms.length > 0) {
        const form = await getForm(forms.forms[0].id, user.cookie);

        assertHasProperty(form.form, "submissionCount", "应该包含提交数量");
        assertEqual(typeof form.form.submissionCount, "number", "提交数量应该是数字");
      }
    });
  });
});
