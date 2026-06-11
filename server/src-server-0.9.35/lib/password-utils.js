import crypto from "node:crypto";

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key.toString("hex"));
    });
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = String(storedHash || "").split(":");
  if (!salt || !expectedHash) return false;
  const actualHash = await scrypt(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

export async function hashVerificationCode(code, salt) {
  return scrypt(`${String(code || "").trim()}:${salt}`, salt);
}

export function createVerifyEmailCode({ readJson, writeJson, emailVerificationsFile, verificationMaxAttempts }) {
  async function verifyEmailCode(email, code, purpose = "register") {
    const normalizedCode = String(code || "").trim();
    if (!/^\d{6}$/.test(normalizedCode)) return { ok: false, error: "请输入邮件里的 6 位验证码。" };
    const records = await readJson(emailVerificationsFile, []);
    const index = records.findIndex((item) => item.email === email && item.purpose === purpose && !item.usedAt);
    const record = index === -1 ? null : records[index];
    if (!record) return { ok: false, error: "请先获取邮箱验证码。" };
    if (new Date(record.expiresAt).getTime() <= Date.now()) return { ok: false, error: "验证码已过期，请重新获取。" };
    if (Number(record.attempts || 0) >= verificationMaxAttempts) return { ok: false, error: "验证码错误次数过多，请重新获取。" };

    const expectedHash = await hashVerificationCode(normalizedCode, record.salt);
    if (expectedHash !== record.codeHash) {
      records[index] = { ...record, attempts: Number(record.attempts || 0) + 1, lastAttemptAt: new Date().toISOString() };
      await writeJson(emailVerificationsFile, records);
      return { ok: false, error: "验证码不正确，请检查邮件后重新输入。" };
    }
    return { ok: true, record };
  }

  async function markEmailCodeUsed(email, code, purpose = "register") {
    const normalizedCode = String(code || "").trim();
    const records = await readJson(emailVerificationsFile, []);
    const next = [];
    for (const item of records) {
      if (item.email === email && item.purpose === purpose && !item.usedAt) {
        const hash = await hashVerificationCode(normalizedCode, item.salt);
        next.push(hash === item.codeHash ? { ...item, usedAt: new Date().toISOString() } : item);
        continue;
      }
      next.push(item);
    }
    await writeJson(emailVerificationsFile, next.slice(0, 1000));
  }

  return { verifyEmailCode, markEmailCodeUsed };
}
