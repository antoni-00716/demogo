import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getRegisterOptions, login, register, sendVerificationCode } from "../api/auth";
import { BrandLogo } from "../components/BrandLogo";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";
import { trackTrialEvent } from "../api/trialEvents";

function validateEmail(v: string) {
  if (!v) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "请输入正确的邮箱地址";
}

function validatePassword(v: string) {
  if (!v) return "";
  return v.length >= 8 ? "" : "密码至少需要 8 位";
}

export function LoginPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [mode, setMode] = useState<"login" | "register">(() => params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [registerOptions, setRegisterOptions] = useState<{ emailVerificationEnabled: boolean; emailConfigured: boolean; emailRequired: boolean; canRegister: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const next = useMemo(() => params.get("next") || "app.html", [params]);
  const emailVerificationRequired = mode === "register" && (registerOptions?.emailRequired ?? true);

  const emailError = emailTouched ? validateEmail(email) : "";
  const passwordError = passwordTouched ? validatePassword(password) : "";
  const canSubmit = !emailError && !passwordError && email && password.length >= 8;

  useEffect(() => {
    getRegisterOptions().then(setRegisterOptions).catch(() => setRegisterOptions({ emailVerificationEnabled: true, emailConfigured: false, emailRequired: true, canRegister: false }));
  }, []);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (mode === "register") void trackTrialEvent("register_view");
  }, [mode]);


  async function submit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!canSubmit) return;
    setLoading(true);
    setMessage("");
    setSuccessMessage("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, verificationCode);
      }
      setSucceeded(true);
      setTimeout(() => { window.location.href = next; }, 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试");
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
      setSuccessMessage("验证码已发送，请查看邮箱");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证码发送失败，请稍后重试");
    } finally {
      setSendingCode(false);
    }
  }

  function switchMode() {
    setEmailTouched(false);
    setPasswordTouched(false);
    setMessage("");
    setSuccessMessage("");
    setVerificationCode("");
    setMode(mode === "login" ? "register" : "login");
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <LinkButton href="/" variant="ghost">
          ← 返回首页
        </LinkButton>
        <Card className={`login-card${succeeded ? " login-succeeded" : ""}`}>
          <a className="brand" href="/">
            <BrandLogo />
          </a>
          {succeeded ? (
            <div className="login-success-state">
              <div className="login-success-icon">✅</div>
              <h1>{mode === "login" ? "登录成功！" : "注册成功！"}</h1>
              <p>正在跳转到工作台...</p>
            </div>
          ) : (
            <>
              <div>
                <p className="login-kicker">{mode === "login" ? "欢迎回来 👋" : "开始使用 DemoGo"}</p>
                <h1>{mode === "login" ? "继续管理你的作品" : "免费注册，生成第一个链接"}</h1>
                <p>{mode === "login" ? "查看你的作品、分享记录和反馈信息" : "注册后上传作品，立刻生成可以发给任何人的链接"}</p>
              </div>
              <div className="login-mode-tabs">
                <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => setMode("login")}>登录</button>
                <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => setMode("register")}>免费注册</button>
              </div>
              <form className="login-form" onSubmit={submit} noValidate>
                <label className="form-field">
                  邮箱
                  <input
                    ref={emailRef}
                    className={`input${emailError ? " input-error" : ""}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    required
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                  {emailError ? <span className="field-error">{emailError}</span> : null}
                </label>
                <label className="form-field">
                  密码
                  <div className="password-wrapper">
                    <input
                      className={`input${passwordError ? " input-error" : ""}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      required
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      placeholder="至少 8 位"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label={showPassword ? "隐藏密码" : "显示密码"}>
                      {showPassword ? "👁‍🗨" : "👁"}
                    </button>
                  </div>
                  {passwordError ? <span className="field-error">{passwordError}</span> : null}
                </label>
                {emailVerificationRequired ? (
                  <div className="verification-row">
                    <label className="form-field">
                      邮箱验证码
                      <input className="input" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required={emailVerificationRequired} inputMode="numeric" maxLength={6} placeholder="6 位验证码" autoComplete="one-time-code" />
                    </label>
                    <Button onClick={handleSendCode} disabled={sendingCode || !email || password.length < 8} loading={sendingCode} variant="secondary">
                      发送验证码
                    </Button>
                  </div>
                ) : null}
                {mode === "register" && registerOptions && !registerOptions.canRegister ? (
                  <Toast message="邮箱验证暂未配置，请稍后再试" tone="warning" />
                ) : null}
                {message ? <Toast message={message} tone="danger" /> : null}
                {successMessage ? <Toast message={successMessage} tone="success" /> : null}
                <Button className="login-primary-action" variant="primary" disabled={loading || (mode === "register" && registerOptions?.canRegister === false) || !canSubmit} loading={loading} type="submit">
                  {mode === "login" ? "登录我的工作台" : "免费注册并进入工作台"}
                </Button>
              </form>
              <button className="login-switch" type="button" onClick={switchMode}>
                {mode === "login" ? "还没有账号？免费注册 DemoGo" : "已有账号？直接登录"}
              </button>
            </>
          )}
        </Card>
        <div className="login-legal">
          <IcpLink />
        </div>
      </div>
    </div>
  );
}
