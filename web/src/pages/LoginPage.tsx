import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getRegisterOptions, login, register, sendVerificationCode } from "../api/auth";
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
      <div className="login-card">
        <div className="logo"><span className="mark">◆</span>DemoGo</div>
        {succeeded ? (
          <div className="login-success-state">
            <span className="login-success-icon">✅</span>
            <h1>{mode === "login" ? "登录成功！" : "注册成功！"}</h1>
            <p>正在跳转到工作台...</p>
          </div>
        ) : (
          <>
            <div className="title">{mode === "login" ? "欢迎回来" : "免费注册 DemoGo"}</div>
            <p className="sub">{mode === "login" ? "登录后继续管理你的作品" : "创建账号，开始发布你的作品"}</p>

            <div className="tabs">
              <button className={`tab${mode === "login" ? " active" : ""}`} type="button" onClick={() => setMode("login")}>登录</button>
              <button className={`tab${mode === "register" ? " active" : ""}`} type="button" onClick={() => setMode("register")}>免费注册</button>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="field">
                <label>邮箱</label>
                <input
                  ref={emailRef}
                  className={emailError ? "input-error" : ""}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  required
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                {emailError ? <span className="field-error">{emailError}</span> : null}
              </div>
              <div className="field">
                <label>密码</label>
                <div className="password-wrapper">
                  <input
                    className={passwordError ? "input-error" : ""}
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
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {passwordError ? <span className="field-error">{passwordError}</span> : null}
              </div>
              {emailVerificationRequired ? (
                <div className="verification-row">
                  <div className="field">
                    <label>邮箱验证码</label>
                    <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required={emailVerificationRequired} inputMode="numeric" maxLength={6} placeholder="6 位验证码" autoComplete="one-time-code" />
                  </div>
                  <button className="btn-sm" type="button" onClick={handleSendCode} disabled={sendingCode || !email || password.length < 8}>
                    {sendingCode ? "发送中..." : "发送验证码"}
                  </button>
                </div>
              ) : null}
              {mode === "register" && registerOptions && !registerOptions.canRegister ? (
                <Toast message="邮箱验证暂未配置，请稍后再试" tone="warning" />
              ) : null}
              {message ? <Toast message={message} tone="danger" /> : null}
              {successMessage ? <Toast message={successMessage} tone="success" /> : null}
              <button className="btn-block" type="submit" disabled={loading || (mode === "register" && registerOptions?.canRegister === false) || !canSubmit}>
                {loading ? (mode === "login" ? "登录中..." : "注册中...") : (mode === "login" ? "进入工作台" : "免费注册并进入工作台")}
              </button>
            </form>

            <p className="footer-text">
              {mode === "login" ? (
                <>还没有账号？<a onClick={switchMode}>免费注册 DemoGo</a></>
              ) : (
                <>已有账号？<a onClick={switchMode}>直接登录</a></>
              )}
            </p>
          </>
        )}
      </div>
      <p className="legal">&copy; 2025 DemoGo. All rights reserved.</p>
    </div>
  );
}
