import { useEffect } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { LinkButton } from "../components/Button";
import { IcpLink } from "../components/IcpLink";
import { trackTrialEvent } from "../api/trialEvents";
import { useScrollReveal } from "../hooks/useScrollReveal";

const values = [
  { icon: "🚀", title: "做好就能发",  text: "不用学部署、不用配服务器，上传你的作品，几秒钟就能得到一个可以发给任何人的链接。" },
  { icon: "👀", title: "先被看见",    text: "产品做出来不是终点，被人打开、被人试用，才算真正开始。DemoGo 帮你迈出第一步。" },
  { icon: "💬", title: "早点收到反馈", text: "链接发出去，反馈收回来。越早知道别人怎么用你的产品，越早做出对的东西。" },
];

const steps = [
  { title: "上传你的作品", text: "把你用 AI 做好的网页、原型、活动页上传到 DemoGo。支持直接上传文件，也可以让 AI 帮你发。" },
  { title: "生成试用链接", text: "DemoGo 自动处理，几秒钟生成一个可以打开、可以分享的链接。不用注册域名，不用管服务器。" },
  { title: "分享收集反馈", text: "把链接发给同事、客户、投资人。他们点开就能用，你也能看到谁打开了、留下了什么反馈。" },
];

const shareTypes = [
  { emoji: "📱", title: "H5 活动页",    desc: "营销活动、节日专题" },
  { emoji: "🎨", title: "产品原型",      desc: "设计稿、交互演示" },
  { emoji: "📝", title: "报名 / 预约",   desc: "活动报名、服务预约" },
  { emoji: "🛠️", title: "工具型产品",   desc: "计算器、生成器、查询页" },
];



export function HomePage() {
  useEffect(() => {
    void trackTrialEvent("home_view");
  }, []);

  const { ref: vRef, isRevealed: vRevealed } = useScrollReveal<HTMLDivElement>();
  const { ref: sRef, isRevealed: sRevealed } = useScrollReveal<HTMLDivElement>();
  const { ref: tRef, isRevealed: tRevealed } = useScrollReveal<HTMLDivElement>();

  return (
    <div className="page home">
      {/* Nav */}
      <header className="site-nav">
        <div className="wrap site-nav-inner">
          <a className="brand" href="/" aria-label="DemoGo 首页">
            <BrandLogo />
          </a>
          <div className="nav-actions">
            <LinkButton href="login.html" variant="ghost">登录</LinkButton>
            <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary">免费开始</LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-orb hero-orb-4" />

          <div className="wrap hero-inner">
            <div className="hero-text">
              <div className="hero-badge">AI 作品分享平台</div>
              <h1>
                你的作品，<br />
                <span className="highlight">值得被看见</span>
              </h1>
              <p className="hero-sub">
                把做好的产品变成可以发出去的链接。<br />
                不用懂技术，几分钟就能开始。
              </p>
            </div>

            <div className="hero-actions">
              <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary" className="btn-lg">免费生成链接</LinkButton>
              <LinkButton href="login.html?mode=register&next=app.html%23agent" variant="secondary" className="btn-lg">让 AI 帮我发布</LinkButton>
            </div>

            {/* Hero preview mockup */}
            <div className="hero-preview">
              <div className="browser-chrome">
                <div className="browser-dot" />
                <div className="browser-dot" />
                <div className="browser-dot" />
                <div className="browser-url">demogo.cn/d/your-project</div>
              </div>
              <div className="browser-body">
                <div className="preview-emoji">🚀</div>
                <div className="preview-title">你的项目上线了</div>
                <div className="preview-sub">
                  一个链接，手机电脑都能打开。分享给任何人，看看他们的反馈。
                </div>
                <div className="preview-badge-row">
                  <span className="preview-badge">立即可打开</span>
                  <span className="preview-badge">无需下载</span>
                  <span className="preview-badge">免费开始</span>
                </div>
              </div>
            </div>

            <div className="hero-trust">
              <span>无需域名</span>
              <span>几秒上线</span>
              <span>手机电脑都能打开</span>
              <span>免费开始</span>
            </div>
          </div>
        </section>

        {/* Section divider */}
        <div className="wrap"><div className="section-divider" /></div>

        {/* Value */}
        <section className="home-values">
          <div className="wrap">
            <div className="section-head center">
              <span className="kicker">为什么现在就开始</span>
              <h2>产品做出来不算完，被看见才算</h2>
            </div>
            <div ref={vRef} className={`three-col scroll-reveal${vRevealed ? " is-revealed" : ""}`}>
              {values.map((v) => (
                <article className="value-card" key={v.title}>
                  <div className="value-icon">{v.icon}</div>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="home-steps section-alt">
          <div className="wrap">
            <div className="section-head center">
              <span className="kicker">三步开始</span>
              <h2>从做好到发出去，只要三步</h2>
            </div>
            <div ref={sRef} className={`three-col scroll-reveal${sRevealed ? " is-revealed" : ""}`}>
              {steps.map((s, i) => (
                <article className="step-card" key={s.title}>
                  <div className="step-number">{i + 1}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* What you can share */}
        <section className="home-types">
          <div className="wrap">
            <div className="section-head center">
              <span className="kicker">什么都能发</span>
              <h2>任何网页作品，都能变链接</h2>
            </div>
            <div ref={tRef} className={`four-col scroll-reveal${tRevealed ? " is-revealed" : ""}`}>
              {shareTypes.map((t) => (
                <article className="type-card" key={t.title}>
                  <span className="type-emoji">{t.emoji}</span>
                  <h4>{t.title}</h4>
                  <p>{t.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="home-cta">
          <div className="wrap home-cta-inner">
            <h2>你的下一个作品，从这里开始被看见</h2>
            <p>免费开始，几分钟就能把链接发出去</p>
            <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary" className="btn-xl">免费生成链接</LinkButton>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="wrap home-footer-inner">
          <div className="footer-brand">
            <BrandLogo />
            <p>让产品连接真实世界</p>
          </div>
          <div className="legal-links">
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

