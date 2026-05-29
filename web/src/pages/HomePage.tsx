import { useEffect } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { LinkButton } from "../components/Button";
import { IcpLink } from "../components/IcpLink";
import { trackTrialEvent } from "../api/trialEvents";

const publishRoutes = [
  {
    label: "AI 发布",
    title: "让 AI 继续完成发布",
    text: "在 Codex、Cursor 等工具里，把做好的项目直接变成试用链接。",
    action: "查看 AI 发布方式",
    href: "login.html?mode=register&next=app.html%23agent"
  },
  {
    label: "上传发布",
    title: "在 DemoGo 里上传项目",
    text: "把网页、原型、Demo 或活动页上传进来，几分钟生成可分享链接。",
    action: "免费生成链接",
    href: "login.html?mode=register&next=app.html%23upload"
  }
];

const engineCards = [
  ["分享", "把本地作品变成在线链接。"],
  ["试用", "用户点开就能体验。"],
  ["反馈", "更早知道产品该怎么改。"]
];

export function HomePage() {
  useEffect(() => {
    void trackTrialEvent("home_view");
  }, []);

  return (
    <div className="page market-home">
      <header className="site-nav market-nav">
        <div className="wrap site-nav-inner">
          <a className="brand" href="/" aria-label="DemoGo 首页">
            <BrandLogo />
          </a>
          <div className="nav-actions">
            <LinkButton href="login.html" variant="ghost">登录</LinkButton>
            <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary">免费发布</LinkButton>
          </div>
        </div>
      </header>

      <main>
        <section className="ai-hero">
          <div className="ai-grid-bg" aria-hidden="true" />
          <div className="wrap ai-hero-inner">
            <div className="ai-hero-copy">
              <h1>DemoGo</h1>
              <p className="ai-hero-title">让产品先被看见</p>
              <p className="ai-hero-lead">
                把做好的产品变成可以发出去的试用链接。
              </p>
              <div className="ai-actions">
                <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary">免费生成链接</LinkButton>
                <LinkButton href="login.html?mode=register&next=app.html%23agent">AI 帮我发布</LinkButton>
              </div>
            </div>
            <LaunchConsole />
          </div>
        </section>

        <section className="ai-section ai-statement" id="why">
          <div className="wrap statement-grid">
            <div>
              <p className="ai-kicker"><span /> 为什么现在就发布</p>
              <h2>产品不该只停在本地。</h2>
            </div>
            <div className="statement-copy">
              <p>先发出去，先被打开，先收到反馈。</p>
              <strong>DemoGo 让产品从完成，走向被试用。</strong>
            </div>
          </div>
        </section>

        <section className="ai-section quiet-section">
          <div className="wrap">
            <div className="engine-grid">
              {engineCards.map(([title, text]) => (
                <article className="engine-card" key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ai-section route-section" id="publish">
          <div className="wrap route-inner">
            <div className="ai-section-head">
              <p className="ai-kicker"><span /> 发布方式</p>
              <h2>两种方式，生成链接。</h2>
            </div>
            <div className="route-grid">
              {publishRoutes.map((route) => (
                <article className="route-card" key={route.label}>
                  <span>{route.label}</span>
                  <h3>{route.title}</h3>
                  <p>{route.text}</p>
                  <LinkButton href={route.href} variant={route.label.includes("AI") ? "primary" : "secondary"}>{route.action}</LinkButton>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ai-final">
          <div className="wrap ai-final-inner">
            <p>生成链接，发给用户。</p>
            <h2>让反馈开始发生。</h2>
            <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary">免费生成链接</LinkButton>
          </div>
        </section>
      </main>

      <footer className="site-footer market-footer">
        <div className="wrap market-footer-inner">
          <div>
            <BrandLogo />
            <p>DemoGo，让产品连接真实世界。</p>
          </div>
          <div className="footer-links">
            <a href="terms.html">服务条款</a>
            <a href="privacy.html">隐私政策</a>
            <a href="content-policy.html">内容政策</a>
            <IcpLink />
          </div>
        </div>
      </footer>
    </div>
  );
}

function LaunchConsole() {
  return (
    <aside className="launch-console" aria-label="DemoGo 链接生成示意">
      <div className="link-stage" aria-hidden="true">
        <span className="link-node">作品</span>
        <span className="link-thread" />
        <span className="link-node link-node-primary">链接</span>
        <span className="link-thread" />
        <span className="link-node">用户</span>
      </div>
      <div className="result-link">
        <strong>demogo.cn/d/launch-a18f2</strong>
      </div>
    </aside>
  );
}
