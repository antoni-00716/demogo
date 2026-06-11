import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  setupTestEnvironment,
  startServer,
  waitForServer,
  testConfig,
  registerAndLogin,
  createZipFromFiles,
  createTarFromFiles,
  inspectProject,
  deployProject,
  getDemos,
  getDemo,
  deleteDemo,
  updateDemoSlug,
  updateDemo,
  takeDemoOffline,
  getText,
  assertEqual,
  assertContains,
  assertHasProperty,
  assertIsArray,
  sleep,
} from "./helpers.mjs";

describe("项目发布流程集成测试", () => {
  let server;
  let user;

  before(async () => {
    await setupTestEnvironment();
    server = startServer();
    await waitForServer(testConfig.baseUrl);
    user = await registerAndLogin();
  });

  after(async () => {
    if (server) {
      server.kill();
      await sleep(500);
    }
  });

  describe("项目检查", () => {
    it("应该成功检查静态HTML项目", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><head><title>Test Project</title></head><body><h1>Test Project</h1></body></html>",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(result.data.ok === true, "应该返回ok=true");
      assert(result.data.inspection, "应该包含inspection");
      assert(result.data.inspection.canPublish === true, "静态HTML应该可发布");
    });

    it("应该成功检查dist构建产物", async () => {
      const zipPath = await createZipFromFiles({
        "dist/index.html": "<!doctype html><html><head><title>Dist Project</title></head><body><h1>Dist Project</h1></body></html>",
        "dist/app.js": "console.log('app');",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(result.data.inspection.analysis.detectedType === "dist", "应该识别为dist类型");
      assert(result.data.inspection.canPublish === true, "dist项目应该可发布");
    });

    it("应该成功检查build构建产物", async () => {
      const zipPath = await createZipFromFiles({
        "build/index.html": "<!doctype html><html><head><title>Build Project</title></head><body><h1>Build Project</h1></body></html>",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(result.data.inspection.analysis.detectedType === "build", "应该识别为build类型");
    });

    it("应该成功检查out构建产物", async () => {
      const zipPath = await createZipFromFiles({
        "out/index.html": "<!doctype html><html><head><title>Out Project</title></head><body><h1>Out Project</h1></body></html>",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(result.data.inspection.analysis.detectedType === "out", "应该识别为out类型");
    });

    it("应该正确识别React项目", async () => {
      const zipPath = await createZipFromFiles({
        "package.json": JSON.stringify({
          name: "react-app",
          dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
          scripts: { build: "vite build" },
        }),
        "src/index.jsx": "import React from 'react'; import ReactDOM from 'react-dom';",
        "src/App.jsx": "export default function App() { return <h1>Hello</h1>; }",
        "vite.config.js": "export default {};",
        "index.html": "<!doctype html><html><body><div id='root'></div></body></html>",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(result.data.inspection.canPublish === true, "React项目应该可发布");
    });

    it("应该正确识别Vue项目", async () => {
      const zipPath = await createZipFromFiles({
        "package.json": JSON.stringify({
          name: "vue-app",
          dependencies: { vue: "^3.0.0" },
          scripts: { build: "vite build" },
        }),
        "src/main.js": "import { createApp } from 'vue';",
        "src/App.vue": "<template><h1>Hello</h1></template>",
        "vite.config.js": "export default {};",
        "index.html": "<!doctype html><html><body><div id='app'></div></body></html>",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(result.data.inspection.canPublish === true, "Vue项目应该可发布");
    });

    it("应该正确识别Node.js后端项目", async () => {
      const zipPath = await createZipFromFiles({
        "package.json": JSON.stringify({
          name: "express-api",
          dependencies: { express: "^4.0.0" },
          scripts: { start: "node index.js" },
        }),
        "index.js": [
          "const express = require('express');",
          "const app = express();",
          "app.listen(process.env.PORT || 3000);",
        ].join("\n"),
      });

      const result = await inspectProject(zipPath, user.cookie);
      assertEqual(result.status, 200, "检查应该返回200状态码");
      assert(
        ["runtime", "node-runtime", "backend"].includes(result.data.inspection.analysis.detectedType),
        "应该识别为运行时类型"
      );
    });

    it("应该拒绝包含危险文件的项目", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>Test</h1></body></html>",
        ".env": "SECRET_KEY=abc123",
      });

      const result = await inspectProject(zipPath, user.cookie);
      assert(result.data.inspection.canPublish === false, "包含.env的项目不应该可发布");
    });

    it("应该正确处理tar.gz格式", async () => {
      const tarPath = await createTarFromFiles({
        "index.html": "<!doctype html><html><head><title>Tar Test</title></head><body><h1>Tar Test</h1></body></html>",
      });

      const FormData = (await import("node:form-data")).default;
      const form = new FormData();
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const fileBuffer = await fs.readFile(tarPath);

      form.append("file", fileBuffer, {
        filename: "test.tar.gz",
        contentType: "application/gzip",
      });

      const response = await fetch(`${testConfig.baseUrl}/api/inspect`, {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
      });

      const data = await response.json();
      assertEqual(response.status, 200, "检查应该返回200状态码");
      assert(data.ok === true, "应该返回ok=true");
    });
  });

  describe("项目部署", () => {
    it("应该成功部署静态HTML项目", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><head><title>部署测试</title></head><body><h1>部署测试成功</h1></body></html>",
      });

      const result = await deployProject(zipPath, { name: "部署测试项目" }, user.cookie);
      assertEqual(result.status, 200, "部署应该返回200状态码");
      assert(result.data.ok === true, "应该返回ok=true");
      assert(result.data.id, "应该返回demo ID");
      assert(result.data.slug, "应该返回slug");
      assert(result.data.link, "应该返回访问链接");
      assertContains(result.data.link, result.data.slug, "链接应该包含slug");

      const page = await getText(`/d/${result.data.slug}/`);
      assertContains(page, "部署测试成功", "页面内容应该匹配");

      await deleteDemo(result.data.id, user.cookie);
    });

    it("应该成功部署dist构建产物", async () => {
      const zipPath = await createZipFromFiles({
        "dist/index.html": "<!doctype html><html><head><title>Dist Deploy</title></head><body><h1>Dist Deploy Test</h1></body></html>",
        "dist/app.js": "console.log('dist deploy');",
      });

      const result = await deployProject(zipPath, { name: "Dist部署测试" }, user.cookie);
      assertEqual(result.status, 200, "部署应该返回200状态码");
      assert(result.data.detectedType === "dist", "应该识别为dist类型");

      const page = await getText(`/d/${result.data.slug}/`);
      assertContains(page, "Dist Deploy Test", "页面应该包含dist内容");

      await deleteDemo(result.data.id, user.cookie);
    });

    it("应该成功部署React源码项目", async () => {
      const zipPath = await createZipFromFiles({
        "package.json": JSON.stringify({
          name: "react-deploy-test",
          dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
          scripts: { build: "vite build" },
        }),
        "vite.config.js": "export default { build: { outDir: 'dist' } };",
        "index.html": "<!doctype html><html><body><div id='root'></div></body></html>",
      });

      const result = await deployProject(zipPath, { name: "React部署测试" }, user.cookie);
      assertEqual(result.status, 200, "部署应该返回200状态码");

      const page = await getText(`/d/${result.data.slug}/`);
      assert(page.length > 0, "页面应该返回内容");

      await deleteDemo(result.data.id, user.cookie);
    });

    it("应该返回正确的部署元数据", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>元数据测试</h1></body></html>",
      });

      const result = await deployProject(zipPath, { name: "元数据测试" }, user.cookie);
      assertEqual(result.status, 200, "部署应该返回200状态码");

      assertHasProperty(result.data, "id", "应该包含id");
      assertHasProperty(result.data, "slug", "应该包含slug");
      assertHasProperty(result.data, "name", "应该包含name");
      assertHasProperty(result.data, "link", "应该包含link");
      assertHasProperty(result.data, "ok", "应该包含ok");
      assertHasProperty(result.data, "createdAt", "应该包含createdAt");
      assertHasProperty(result.data, "contentReviewStatus", "应该包含contentReviewStatus");

      await deleteDemo(result.data.id, user.cookie);
    });

    it("应该自动生成slug", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>自动Slug测试</h1></body></html>",
      });

      const result = await deployProject(zipPath, { name: "自动Slug测试" }, user.cookie);
      assertEqual(result.status, 200, "部署应该返回200状态码");
      assert(result.data.slug, "应该自动生成slug");
      assert(result.data.slug.length > 0, "slug不应该为空");

      await deleteDemo(result.data.id, user.cookie);
    });
  });

  describe("项目列表和详情", () => {
    let testDemo;

    before(async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>列表测试</h1></body></html>",
      });

      const result = await deployProject(zipPath, { name: "列表测试项目" }, user.cookie);
      testDemo = result.data;
    });

    after(async () => {
      if (testDemo) {
        await deleteDemo(testDemo.id, user.cookie);
      }
    });

    it("应该能够获取用户的项目列表", async () => {
      const result = await getDemos(user.cookie);
      assertIsArray(result.demos, "应该返回demos数组");
      assert(result.demos.length > 0, "应该至少有一个demo");

      const found = result.demos.find((d) => d.id === testDemo.id);
      assert(found, "应该能在列表中找到刚创建的demo");
    });

    it("应该能够获取项目详情", async () => {
      const result = await getDemo(testDemo.id, user.cookie);
      assertEqual(result.demo.id, testDemo.id, "应该返回正确的demo ID");
      assertEqual(result.demo.name, "列表测试项目", "应该返回正确的名称");
      assertHasProperty(result, "events", "应该包含events");
    });

    it("应该能够更新项目名称", async () => {
      const newName = "新名称测试";
      const result = await updateDemo(testDemo.id, { name: newName }, user.cookie);
      assertEqual(result.status, 200, "更新应该返回200状态码");

      const updated = await getDemo(testDemo.id, user.cookie);
      assertEqual(updated.demo.name, newName, "名称应该已更新");
    });

    it("应该能够将项目下线", async () => {
      const result = await takeDemoOffline(testDemo.id, user.cookie);
      assertEqual(result.status, 200, "下线应该返回200状态码");
    });

    it("应该能够删除项目", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>删除测试</h1></body></html>",
      });

      const deployResult = await deployProject(zipPath, { name: "删除测试" }, user.cookie);
      const deleteResult = await deleteDemo(deployResult.data.id, user.cookie);
      assertEqual(deleteResult.status, 200, "删除应该返回200状态码");

      const demos = await getDemos(user.cookie);
      const found = demos.demos.find((d) => d.id === deployResult.data.id);
      assert(!found, "删除后不应该在列表中找到");
    });
  });

  describe("链接更新（Lite/Pro套餐）", () => {
    it("Free用户不应该能更新链接后缀", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>链接更新测试</h1></body></html>",
      });

      const result = await deployProject(zipPath, { name: "链接测试" }, user.cookie);
      const updateResult = await fetch(`${testConfig.baseUrl}/api/demos/${result.data.id}/slug`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: user.cookie,
        },
        body: JSON.stringify({ slug: "custom-slug" }),
      });

      assertEqual(updateResult.status, 403, "Free用户更新链接应该返回403");
    });
  });

  describe("SPA深层路由", () => {
    it("应该正确处理SPA深层路由", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><head><title>SPA Test</title></head><body><div id='root'></div><script>window.__DEMOGO_SPA__ = true;</script></body></html>",
      });

      const result = await deployProject(zipPath, { name: "SPA测试" }, user.cookie);
      const deepRoutePage = await getText(`/d/${result.data.slug}/dashboard/settings`);

      assert(deepRoutePage.length > 0, "深层路由应该返回页面内容");

      await deleteDemo(result.data.id, user.cookie);
    });
  });

  describe("内容安全检查", () => {
    it("应该拒绝包含危险内容的项目", async () => {
      const zipPath = await createZipFromFiles({
        "index.html": "<!doctype html><html><body><h1>Credit Card: 1234-5678-9012-3456</h1></body></html>",
      });

      const result = await deployProject(zipPath, { name: "危险内容测试" }, user.cookie);
      assert(
        result.data.contentReviewStatus === "failed" || result.data.contentReview?.status === "failed",
        "包含信用卡号的项目应该被拒绝"
      );
    });
  });
});
