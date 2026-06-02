import { useEffect } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { LinkButton } from "../components/Button";
import { IcpLink } from "../components/IcpLink";
import { trackTrialEvent } from "../api/trialEvents";
import { useScrollReveal } from "../hooks/useScrollReveal";

const heroFeatures = [
  { icon: "🌐", title: "即开即用",   desc: "不用买域名、不用备案，链接发给谁都能打开" },
  { icon: "⚡", title: "几秒就好",   desc: "传上去马上就能用，比你发微信还快" },
  { icon: "📱", title: "哪都能看",   desc: "手机、平板、电脑，点开就是你的作品" },
  { icon: "🎁", title: "免费开始",   desc: "免费套餐够用，需要更多功能再升级" },
];

const whyDemoGo = [
  { emoji: "😤", title: "发给别人看", old: "截图发微信 → 糊了、没法点、说不清",   better: "一个链接，啥都不用装" },
  { emoji: "🤷", title: "想知道反馈", old: "发出去石沉大海，不知道谁看了",         better: "看得到谁打开、看了多久" },
  { emoji: "💰", title: "担心花钱",   old: "买个服务器？买个域名？完全不懂",       better: "免费就能用，够用不花一分钱" },
];

const steps = [
  { title: "上传你的作品", text: "打开网页上传文件，或者在 AI 工具里敲一行命令发布。两种方式，随你方便。" },
  { title: "自动生成链接", text: "几秒钟就好，你不用做任何设置。链接自动生成，复制就能用。" },
  { title: "发给任何人",   text: "复制链接发给同事、客户、朋友。点开就能看，你还能收到他们的反馈。" },
];


export function HomePage() {
  useEffect(() => {
    void trackTrialEvent("home_view");
  }, []);

  const { ref: vRef, isRevealed: vRevealed } = useScrollReveal<HTMLDivElement>();
  const { ref: wRef, isRevealed: wRevealed } = useScrollReveal<HTMLDivElement>();

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
              <div className="hero-badge">让作品被看见</div>
              <h1>
                你的作品，<br />
                <span className="highlight">值得被看见</span>
              </h1>
              <p className="hero-sub">
                做完了？传上来，几秒钟得到一个链接。<br />
                发给谁都能打开，免费就能用。
              </p>
            </div>

            <div className="hero-actions">
              <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary" className="btn-lg">
                📦 上传文件，生成链接
              </LinkButton>
              <LinkButton href="login.html?mode=register&next=app.html%23agent" variant="secondary" className="btn-lg">
                🤖 在 AI 工具里直接发布
              </LinkButton>
            </div>
            <p className="hero-actions-sub">支持 Cursor / Windsurf / Codex 等 AI 编程工具</p>

            {/* Hero feature cards */}
            <div className="hero-features">
              {heroFeatures.map((f, i) => (
                <article className="hero-feature-card" key={f.title} style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                  <span className="hf-icon">{f.icon}</span>
                  <div className="hf-body">
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                </article>
              ))}
            </div>

            {/* Hero preview mockup */}
            <div className="hero-preview">
              <div className="browser-chrome">
                <div className="browser-dot" />
                <div className="browser-dot" />
                <div className="browser-dot" />
                <div className="browser-url">demogo.cn/d/你的项目</div>
              </div>
              <div className="browser-body">
                <div className="preview-emoji">🚀</div>
                <div className="preview-title">你的链接生成好了</div>
                <div className="preview-sub">
                  一个链接，手机电脑都能打开。分享给任何人，看看他们的反馈。
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section divider */}
        <div className="wrap"><div className="section-divider" /></div>

        {/* Why DemoGo */}
        <section className="home-why">
          <div className="wrap">
            <div className="section-head center">
              <span className="kicker">对比一下</span>
              <h2>不只是发链接，比你想的更省心</h2>
            </div>
            <div ref={vRef} className={`three-col scroll-reveal${vRevealed ? " is-revealed" : ""}`}>
              {whyDemoGo.map((w) => (
                <article className="why-card" key={w.title}>
                  <div className="why-emoji">{w.emoji}</div>
                  <h3>{w.title}</h3>
                  <div className="why-compare">
                    <div className="why-old">
                      <span className="why-label">以前</span>
                      <p>{w.old}</p>
                    </div>
                    <div className="why-arrow">→</div>
                    <div className="why-better">
                      <span className="why-label why-label-new">DemoGo</span>
                      <p>{w.better}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="home-why-trust">已有超过 1,000 个项目通过 DemoGo 发布</p>
          </div>
        </section>

        {/* How it works */}
        <section className="home-steps">
          <div className="wrap">
            <div className="section-head center">
              <span className="kicker">三步就够了</span>
              <h2>上传 → 生成 → 分享，就这么简单</h2>
            </div>
            <div ref={wRef} className={`three-col scroll-reveal${wRevealed ? " is-revealed" : ""}`}>
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

        {/* CTA */}
        <section className="home-cta">
          <div className="wrap home-cta-inner">
            <h2>准备好了吗？</h2>
            <p>免费开始，不满意不花一分钱</p>
            <LinkButton href="login.html?mode=register&next=app.html%23upload" variant="primary" className="btn-xl">免费生成链接</LinkButton>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="wrap home-footer-inner">
          <div className="footer-brand">
            <BrandLogo />
            <p>让作品连接真实世界</p>
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
