import tls from "node:tls";
import net from "node:net";

export function isEmailConfigured(config) {
  if (!config) return false;
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = config || {};
  return Boolean(smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom);
}

export async function sendVerificationEmail(to, code, { sendSmtpMail }) {
  const subject = "DemoGo 注册验证码";
  const text = [
    `你的 DemoGo 注册验证码是：${code}`,
    "",
    "验证码 10 分钟内有效。若不是你本人操作，请忽略这封邮件。"
  ].join("\n");
  await sendSmtpMail({
    to,
    subject,
    text,
    html: `<p>你的 DemoGo 注册验证码是：</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p><p>验证码 10 分钟内有效。若不是你本人操作，请忽略这封邮件。</p>`
  });
}

export function createSmtpMailer(config) {
  async function sendSmtpMail({ to, subject, text, html }) {
    let socket = config.smtpSecure
      ? tls.connect({ host: config.smtpHost, port: config.smtpPort, servername: config.smtpHost })
      : net.connect({ host: config.smtpHost, port: config.smtpPort });
    socket.setEncoding("utf8");

    let buffer = "";

    function attachReader(nextSocket) {
      nextSocket.setEncoding("utf8");
      nextSocket.on("data", (chunk) => {
        buffer += chunk;
      });
      socket = nextSocket;
    }

    attachReader(socket);

    function cleanup() {
      socket.end();
      socket.destroy();
    }

    async function readResponse(expected) {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const respLines = buffer.split(/\r?\n/).filter(Boolean);
        const last = respLines[respLines.length - 1] || "";
        if (/^\d{3} /.test(last)) {
          const response = buffer;
          buffer = "";
          const code = Number(last.slice(0, 3));
          if (!expected.includes(code)) throw new Error(`邮件服务器返回异常：${last}`);
          return response;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error("邮件服务器响应超时。");
    }

    function writeLine(line) {
      socket.write(`${line}\r\n`);
    }

    try {
      await new Promise((resolve, reject) => {
        socket.once(config.smtpSecure ? "secureConnect" : "connect", resolve);
        socket.once("error", reject);
        socket.setTimeout(20000, () => reject(new Error("连接邮件服务器超时。")));
      });
      await readResponse([220]);
      const ehloHost = config.publicBaseUrl.replace(/^https?:\/\//, "").split("/")[0] || "demogo.cn";
      writeLine(`EHLO ${ehloHost}`);
      await readResponse([250]);
      if (!config.smtpSecure) {
        writeLine("STARTTLS");
        await readResponse([220]);
        await new Promise((resolve, reject) => {
          socket.removeAllListeners("data");
          const secureSocket = tls.connect({ socket, servername: config.smtpHost }, resolve);
          secureSocket.once("error", reject);
          attachReader(secureSocket);
        });
        writeLine(`EHLO ${ehloHost}`);
        await readResponse([250]);
      }
      writeLine("AUTH LOGIN");
      await readResponse([334]);
      writeLine(Buffer.from(config.smtpUser).toString("base64"));
      await readResponse([334]);
      writeLine(Buffer.from(config.smtpPass).toString("base64"));
      await readResponse([235]);
      const fromAddr = config.smtpFrom.match(/<([^>]+)>/)?.[1] || config.smtpFrom;
      writeLine(`MAIL FROM:<${fromAddr}>`);
      await readResponse([250]);
      writeLine(`RCPT TO:<${to}>`);
      await readResponse([250, 251]);
      writeLine("DATA");
      await readResponse([354]);
      const mailLines = [
        `From: ${config.smtpFrom}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
        "MIME-Version: 1.0",
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(html, "utf8").toString("base64")
      ];
      writeLine(mailLines.join("\r\n"));
      writeLine(".");
      await readResponse([250]);
      writeLine("QUIT");
      cleanup();
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  return { sendSmtpMail };
}


// DemoGo v0.9.7 - Demo 到期提醒邮件
export async function sendExpirationReminderEmail(to, { demoName, demoSlug, hoursLeft, expiresAt }, { sendSmtpMail, baseUrl }) {
  const demoUrl = `${baseUrl || "https://demogo.cn"}/d/${demoSlug}`;
  const timeLabel = hoursLeft <= 1 ? "1 小时内" : `${hoursLeft} 小时后`;
  const expiryDate = new Date(expiresAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  const subject = `[DemoGo] 你的试用 Demo「${demoName}」即将到期`;
  const text = [
    `你的 DemoGo 试用项目「${demoName}」将在 ${timeLabel} 到期。`,
    "",
    `到期时间：${expiryDate}`,
    `访问地址：${demoUrl}`,
    "",
    "到期后链接将无法访问。如需继续使用，可以：",
    "1. 重新上传发布（自动延长有效期）",
    "2. 升级到 Lite 或 Pro 套餐（有效期延长至 30 天）",
    "",
    `升级地址：${baseUrl || "https://demogo.cn"}/dashboard`,
    "",
    "— DemoGo 团队"
  ].join("\n");

  const html = [
    `<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">`,
    `<h2 style="color:#1a1a2e;">你的试用 Demo 即将到期</h2>`,
    `<p>你的 DemoGo 试用项目 <strong>「${demoName}」</strong> 将在 <strong style="color:#e74c3c;">${timeLabel}</strong> 到期。</p>`,
    `<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;">`,
    `<p style="margin:4px 0;"><strong>到期时间：</strong>${expiryDate}</p>`,
    `<p style="margin:4px 0;"><strong>访问地址：</strong><a href="${demoUrl}">${demoUrl}</a></p>`,
    `</div>`,
    `<p>到期后链接将无法访问。如需继续使用：</p>`,
    `<ol>`,
    `<li>重新上传发布（自动延长有效期）</li>`,
    `<li><a href="${baseUrl || "https://demogo.cn"}/dashboard" style="color:#3498db;">升级到 Lite 或 Pro 套餐</a>（有效期延长至 30 天）</li>`,
    `</ol>`,
    `<p style="color:#888;font-size:12px;margin-top:24px;">— DemoGo 团队</p>`,
    `</div>`
  ].join("\n");

  await sendSmtpMail({ to, subject, text, html });
}