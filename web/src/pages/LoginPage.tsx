import { useMemo, useState, type FormEvent } from "react";
import { login, register } from "../api/auth";
import { BrandLogo } from "../components/BrandLogo";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const next = useMemo(() => new URLSearchParams(window.location.search).get("next") || "app.html", []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      window.location.href = next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setLoading(false);
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
            <h1>{mode === "login" ? "登录工作台" : "创建 DemoGo 账号"}</h1>
            <p>上传 AI 生成的项目包，生成可打开、可转发、可试用的链接。</p>
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
            {message ? <Toast message={message} tone="danger" /> : null}
            <Button variant="primary" disabled={loading} type="submit">
              {loading ? "处理中..." : mode === "login" ? "登录" : "注册并进入工作台"}
            </Button>
          </form>
          <button className="login-switch" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "还没有账号？创建一个" : "已有账号？直接登录"}
          </button>
        </Card>
        <div className="login-legal">
          <IcpLink />
        </div>
      </div>
    </div>
  );
}
