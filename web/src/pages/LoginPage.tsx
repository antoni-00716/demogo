import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getRegisterOptions, login, register, sendVerificationCode } from "../api/auth";
import { BrandLogo } from "../components/BrandLogo";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";
import { trackTrialEvent } from "../api/trialEvents";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">(() => new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [registerOptions, setRegisterOptions] = useState<{ emailVerificationEnabled: boolean; emailConfigured: boolean; emailRequired: boolean; canRegister: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const next = useMemo(() => new URLSearchParams(window.location.search).get("next") || "app.html", []);
  const emailVerificationRequired = mode === "register" && (registerOptions?.emailRequired ?? true);

  useEffect(() => {
    getRegisterOptions().then(setRegisterOptions).catch(() => setRegisterOptions({ emailVerificationEnabled: true, emailConfigured: false, emailRequired: true, canRegister: false }));
  }, []);

  useEffect(() => {
    if (mode === "register") void trackTrialEvent("register_view");
  }, [mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccessMessage("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, verificationCode);
      }
      window.location.href = next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode() {
    setSendingCode(true);
    setMessage("");
    setSuccessMessage("");
    try {
      await sendVerificationCode(email, password);
      setSuccessMessage("验证码已发送，请查看邮箱并在 10 分钟内填写。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证码发送失败，请稍后重试。");
    } finally {
      setSendingCode(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <LinkButton href="/" variant="ghost">
          返回首页
        </LinkButton>
        <Card className="login-card">
          <a className="brand" href="/">
            <BrandLogo />
          </a>
          <div>
            <p className="login-kicker">{mode === "login" ? "欢迎回来" : "开始使用 DemoGo"}</p>
            <h1>{mode === "login" ? "继续管理试用链接" : "生成第一个试用链接"}</h1>
            <p>{mode === "login" ? "查看项目、AI 发布口令和试用反馈。" : "注册后上传作品，发给用户先试用。"}</p>
          </div>
          <div className="login-mode-tabs">
            <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => setMode("login")}>登录</button>
            <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => setMode("register")}>免费注册</button>
          </div>
          <form className="login-form" onSubmit={submit}>
            <label className="form-field">
              邮箱
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} required type="email" />
            </label>
            <label className="form-field">
              密码
              <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} type="password" />
            </label>
            {emailVerificationRequired ? (
              <div className="verification-row">
                <label className="form-field">
                  邮箱验证码
                  <input className="input" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} required={emailVerificationRequired} inputMode="numeric" maxLength={6} placeholder="6 位验证码" />
                </label>
                <Button onClick={handleSendCode} disabled={sendingCode || !email || password.length < 8}>
                  {sendingCode ? "发送中..." : "发送验证码"}
                </Button>
              </div>
            ) : null}
            {mode === "register" && registerOptions && !registerOptions.canRegister ? (
              <Toast message="邮箱验证码暂未配置，请稍后再注册或联系 DemoGo 管理员。" tone="warning" />
            ) : null}
            {message ? <Toast message={message} tone="danger" /> : null}
            {successMessage ? <Toast message={successMessage} tone="success" /> : null}
            <Button className="login-primary-action" variant="primary" disabled={loading || (mode === "register" && registerOptions?.canRegister === false)} type="submit">
              {loading ? "处理中..." : mode === "login" ? "登录工作台" : "免费注册并进入工作台"}
            </Button>
          </form>
          <button className="login-switch" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "还没有账号？免费注册 DemoGo" : "已有账号？直接登录"}
          </button>
        </Card>
        <div className="login-legal">
          <IcpLink />
        </div>
      </div>
    </div>
  );
}
