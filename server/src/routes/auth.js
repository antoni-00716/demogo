// DemoGo v0.9.6 ? Auth routes (updated to match server.js inline code)

import crypto from "node:crypto";



export function registerAuthRoutes(app, deps) {

  const {

    requireUser,

    requireAgentToken,

    emailVerificationEnabled,

    verificationCodeTtlMs,

    verificationResendMs,

    readJson,

    writeJson,

    usersFile,

    sessionsFile,

    emailVerificationsFile,

    demosFile,

    isEmailConfigured,

    smtpHost,

    smtpPort,

    smtpUser,

    smtpPass,

    smtpFrom,

    normalizeEmail,

    hashPassword,

    verifyPassword,

    hashVerificationCode,

    verifyEmailCode,

    markEmailCodeUsed,

    sendVerificationEmail,

    sendSmtpMail,

    createSession,

    setSessionCookie,

    checkLoginFailureRate,

    recordLoginFailure,

    clearLoginFailures,

    createAgentTokenRecord,

    publicAgentToken,

    getUserFromRequest,

    getClientIp,

    writeTrialEvent,

    writeAuditLog,

    publicUser,

    publicUserDemo,

    calculateQuota,

  } = deps;



  // --- /api/auth/register-options ---

  app.get("/api/auth/register-options", (_req, res) => {

    res.json({

      emailVerificationEnabled,

      emailConfigured: isEmailConfigured({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom }),

      emailRequired: emailVerificationEnabled,

      canRegister: !emailVerificationEnabled || isEmailConfigured({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })

    });

  });



  // --- /api/auth/send-verification-code ---

  app.post("/api/auth/send-verification-code", async (req, res, next) => {

    try {

      if (!emailVerificationEnabled) {

        res.json({ ok: true, message: "当前未开启邮箱验证码。" });

        return;

      }

      if (!isEmailConfigured({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })) {

        res.status(503).json({ error: "邮箱验证码暂未配置，请联系 DemoGo 管理员。" });

        return;

      }



      const email = normalizeEmail(req.body?.email);

      const password = String(req.body?.password || "");

      if (!email || !password || password.length < 8) {

        res.status(400).json({ error: "请输入邮箱和至少 8 位密码后再获取验证码" });

        return;

      }



      const users = await readJson(usersFile, []);

      if (users.some((user) => user.email === email)) {

        res.status(409).json({ error: "该邮箱已注册，请直接登录" });

        return;

      }



      const records = await readJson(emailVerificationsFile, []);

      const now = Date.now();

      const active = records.find((item) => item.email === email && item.purpose === "register" && !item.usedAt && new Date(item.expiresAt).getTime() > now);

      if (active && new Date(active.lastSentAt || active.createdAt).getTime() + verificationResendMs > now) {

        const seconds = Math.ceil((new Date(active.lastSentAt || active.createdAt).getTime() + verificationResendMs - now) / 1000);

        res.status(429).json({ error: `验证码发送过于频繁，请 ${seconds} 秒后再试。` });

        return;

      }



      const code = String(crypto.randomInt(100000, 1000000));

      const salt = crypto.randomBytes(12).toString("hex");

      const record = {

        id: crypto.randomUUID(),

        email,

        purpose: "register",

        codeHash: await hashVerificationCode(code, salt),
        code: code,

        salt,

        attempts: 0,

        createdAt: new Date(now).toISOString(),

        lastSentAt: new Date(now).toISOString(),

        expiresAt: new Date(now + verificationCodeTtlMs).toISOString()

      };

      await sendVerificationEmail(email, code, { sendSmtpMail });

      await writeJson(emailVerificationsFile, [

        record,

        ...records.filter((item) => !(item.email === email && item.purpose === "register" && !item.usedAt)).slice(0, 999)

      ]);

      res.json({ ok: true, expiresInSeconds: Math.floor(verificationCodeTtlMs / 1000), resendAfterSeconds: Math.floor(verificationResendMs / 1000) });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/auth/register ---

  app.post("/api/auth/register", async (req, res, next) => {

    try {

      const email = normalizeEmail(req.body?.email);

      const password = String(req.body?.password || "");

      const verificationCode = String(req.body?.verificationCode || "").trim();



      if (!email || !password || password.length < 8) {

        res.status(400).json({ error: "请输入邮箱和至少 8 位密码" });

        return;

      }



      const users = await readJson(usersFile, []);

      if (users.some((user) => user.email === email)) {

        res.status(409).json({ error: "该邮箱已注册，请直接登录" });

        return;

      }



      if (emailVerificationEnabled) {

        if (!isEmailConfigured({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })) {

          res.status(503).json({ error: "邮箱验证码暂未配置，请联系 DemoGo 管理员。" });

          return;

        }

        const verification = await verifyEmailCode(email, verificationCode, "register");

        if (!verification.ok) {

          res.status(400).json({ error: verification.error });

          return;

        }

      }



      const user = {

        id: crypto.randomUUID(),

        email,

        plan: "free",

        createdAt: new Date().toISOString(),

        passwordHash: await hashPassword(password)

      };



      users.push(user);

      await writeJson(usersFile, users);

      if (emailVerificationEnabled) await markEmailCodeUsed(email, verificationCode, "register");

      await writeTrialEvent({

        eventType: "register_success",

        userId: user.id,

        userEmail: user.email,

        source: "auth",

        path: "/api/auth/register",

        ip: getClientIp(req)

      });

      const session = await createSession(user.id);

      setSessionCookie(res, session.token, req);

      res.json({ user: publicUser(user) });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/auth/login ---

  app.post("/api/auth/login", async (req, res, next) => {

    try {

      const email = normalizeEmail(req.body?.email);

      const password = String(req.body?.password || "");

      const clientIp = getClientIp(req);

      const rate = checkLoginFailureRate(email, clientIp);

      if (!rate.allowed) {

        recordLoginFailure(email, clientIp);

        res.status(429).json({ error: "登录尝试过多，请稍后再试" });

        return;

      }

      const users = await readJson(usersFile, []);

      const user = users.find((item) => item.email === email);



      if (!user || !(await verifyPassword(password, user.passwordHash))) {

        recordLoginFailure(email, clientIp);

        res.status(401).json({ error: "邮箱或密码不正确" });

        return;

      }



      clearLoginFailures(email, clientIp);

      const session = await createSession(user.id);

      setSessionCookie(res, session.token, req);

      res.json({ user: publicUser(user) });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/auth/logout ---

  app.post("/api/auth/logout", async (req, res, next) => {

    try {

      const token = req.cookies?.demogo_session;

      if (token) {

        const sessions = await readJson(sessionsFile, []);

        await writeJson(sessionsFile, sessions.filter((session) => session.token !== token));

      }

      res.clearCookie("demogo_session");

      res.json({ ok: true });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/me ---

  app.get("/api/me", async (req, res, next) => {

    try {

      const user = await getUserFromRequest(req);

      if (!user) {

        res.status(401).json({ error: "请先登录" });

        return;

      }

      const demos = await readJson(demosFile, []);

      res.json({

        user: publicUser(user),

        demos: demos.filter((demo) => demo.userId === user.id).map(publicUserDemo),

        quota: calculateQuota(user, demos)

      });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/agent-token (GET) --- 返回当前 Agent Token 状态（不含 value，仅含 enabled/prefix/createdAt）

  app.get("/api/agent-token", requireUser, async (req, res, next) => {

    try {

      res.json({ token: publicAgentToken(req.user) });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/agent-token (POST) --- 生成/重新生成 Agent Token（返回含 value 的完整 token）

  app.post("/api/agent-token", requireUser, async (req, res, next) => {

    try {

      const users = await readJson(usersFile, []);

      const userIndex = users.findIndex((user) => user.id === req.user.id);

      if (userIndex === -1) {

        res.status(404).json({ error: "未找到当前用户，请重新登录。" });

        return;

      }

      const { plainToken, token } = createAgentTokenRecord();

      users[userIndex] = {

        ...users[userIndex],

        agentToken: token,

        updatedAt: new Date().toISOString()

      };

      await writeJson(usersFile, users);

      await writeAuditLog({

        action: "reset_agent_token",

        actorType: "user",

        actorId: req.user.id,

        targetType: "user",

        targetId: req.user.id,

        ip: getClientIp(req),

        metadata: { prefix: token.prefix }

      });

      res.json({ token: { ...publicAgentToken(users[userIndex]), value: plainToken } });

    } catch (error) {

      next(error);

    }

  });



  // --- /api/agent/token-check ---

  app.get("/api/agent/token-check", requireAgentToken, async (req, res) => {

    res.json({

      ok: true,

      token: publicAgentToken(req.user),

      user: {

        id: req.user.id,

        email: req.user.email,

        plan: req.user.plan

      }

    });

  });

}

