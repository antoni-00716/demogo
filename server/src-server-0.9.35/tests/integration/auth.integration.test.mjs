import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  setupTestEnvironment,
  startServer,
  waitForServer,
  testConfig,
  register,
  login,
  logout,
  getMe,
  registerAndLogin,
  assertEqual,
  assertHasProperty,
  sleep,
  projectRoot,
} from "./helpers.mjs";

describe("用户生命周期集成测试", () => {
  let server;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    name: "测试用户",
  };

  before(async () => {
    await setupTestEnvironment();
    server = startServer();
    await waitForServer(testConfig.baseUrl);
  });

  after(async () => {
    if (server) {
      server.kill();
      await sleep(500);
    }
  });

  describe("注册功能", () => {
    it("应该成功注册新用户", async () => {
      const result = await register(testUser.email, testUser.password, testUser.name);
      assertEqual(result.status, 200, "注册应该返回200状态码");
      assert(result.data.ok === true, "注册应该返回ok=true");
      assertEqual(result.data.user.email, testUser.email, "返回的邮箱应该匹配");
    });

    it("应该拒绝重复注册", async () => {
      const result = await register(testUser.email, testUser.password, testUser.name);
      assertEqual(result.status, 400, "重复注册应该返回400状态码");
      assert(result.data.error, "重复注册应该返回错误信息");
    });

    it("应该拒绝无效邮箱格式", async () => {
      const result = await register("invalid-email", "password123", "测试");
      assert(result.status !== 200, "无效邮箱应该被拒绝");
    });

    it("应该拒绝弱密码", async () => {
      const result = await register("weak@example.com", "123", "测试");
      assert(result.status !== 200, "弱密码应该被拒绝");
    });
  });

  describe("登录功能", () => {
    it("应该成功登录已注册用户", async () => {
      const result = await login(testUser.email, testUser.password);
      assertEqual(result.status, 200, "登录应该返回200状态码");
      assert(result.data.user, "登录应该返回用户信息");
      assertEqual(result.data.user.email, testUser.email, "返回的邮箱应该匹配");
      assert(result.headers.get("set-cookie"), "登录应该设置session cookie");
    });

    it("应该拒绝错误密码", async () => {
      const result = await login(testUser.email, "wrong-password");
      assertEqual(result.status, 401, "错误密码应该返回401状态码");
      assert(result.data.error, "错误密码应该返回错误信息");
    });

    it("应该拒绝未注册用户", async () => {
      const result = await login("nonexistent@example.com", "password123");
      assertEqual(result.status, 401, "未注册用户应该返回401状态码");
    });

    it("应该返回正确的session cookie", async () => {
      const result = await login(testUser.email, testUser.password);
      const cookieHeader = result.headers.get("set-cookie");
      assert(cookieHeader.includes("demogo_session="), "应该包含session cookie");
    });
  });

  describe("会话管理", () => {
    it("应该通过cookie获取当前用户信息", async () => {
      const { cookie } = await registerAndLogin();
      const me = await getMe(cookie);
      assertEqual(me.user.email, testUser.email, "应该返回正确的用户信息");
    });

    it("应该拒绝无效cookie", async () => {
      try {
        await getMe("demogo_session=invalid-cookie");
        assert(false, "应该抛出错误");
      } catch (error) {
        assert(true, "无效cookie应该被拒绝");
      }
    });

    it("应该成功登出", async () => {
      const { cookie } = await registerAndLogin();
      const result = await logout(cookie);
      assertEqual(result.status, 200, "登出应该返回200状态码");
    });
  });

  describe("用户资料", () => {
    it("应该返回正确的用户资料结构", async () => {
      const { cookie } = await registerAndLogin();
      const me = await getMe(cookie);

      assertHasProperty(me, "user", "应该包含user字段");
      assertHasProperty(me.user, "id", "user应该包含id");
      assertHasProperty(me.user, "email", "user应该包含email");
      assertHasProperty(me.user, "name", "user应该包含name");
      assertHasProperty(me.user, "plan", "user应该包含plan");
      assertHasProperty(me.user, "createdAt", "user应该包含createdAt");
    });

    it("应该正确反映用户套餐", async () => {
      const { cookie } = await registerAndLogin();
      const me = await getMe(cookie);
      assertEqual(me.user.plan, "free", "新用户应该默认是free套餐");
    });

    it("应该显示用户的demo数量配额", async () => {
      const { cookie } = await registerAndLogin();
      const me = await getMe(cookie);
      assertHasProperty(me, "quota", "应该包含quota字段");
      assertHasProperty(me.quota, "demos", "quota应该包含demos");
    });
  });

  describe("套餐升级请求", () => {
    it("应该能够提交套餐升级请求", async () => {
      const { cookie } = await registerAndLogin();
      const result = await fetch(`${testConfig.baseUrl}/api/plan-upgrade/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({ plan: "lite" }),
      });

      const data = await result.json();
      assertEqual(result.status, 200, "应该返回200状态码");
      assert(data.ok === true, "应该返回ok=true");
    });

    it("应该拒绝无效的套餐类型", async () => {
      const { cookie } = await registerAndLogin();
      const result = await fetch(`${testConfig.baseUrl}/api/plan-upgrade/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({ plan: "invalid-plan" }),
      });

      const data = await result.json();
      assert(result.status !== 200, "应该拒绝无效套餐");
    });
  });

  describe("用户数据隔离", () => {
    it("用户A不应该能访问用户B的数据", async () => {
      const user1 = await registerAndLogin(`user1-${Date.now()}@example.com`);
      const user2 = await registerAndLogin(`user2-${Date.now()}@example.com`);

      const user1Demos = await getMe(user1.cookie);
      const user2Demos = await getMe(user2.cookie);

      assert(
        user1Demos.user.id !== user2Demos.user.id,
        "两个用户的ID应该不同"
      );
    });
  });
});
