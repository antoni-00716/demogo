import { useEffect } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { LinkButton } from "../components/Button";
import { IcpLink } from "../components/IcpLink";
import { trackTrialEvent } from "../api/trialEvents";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
  Terminal,
  ArrowRight,
  Globe,
  RefreshCw,
  Sparkles,
  ChevronDown,
} from "lucide-react";

// ── Data ──

const comparisonCards = [
  {
    icon: Terminal,
    worry: '"部署"两个字就劝退了',
    whyHard: "域名、DNS、SSL、服务器、环境配置……这些词听都没听过",
    solution: "跟 AI 说一声，DemoGo 全部自动搞定",
  },
  {
    icon: Globe,
    worry: '"发给别人看"太难了',
    whyHard: "截图→糊了，发文件→打不开，发安装包→没人装，都不如一个链接",
    solution: "一个链接，手机电脑都能打开",
  },
  {
    icon: RefreshCw,
    worry: '"改了东西"就要重新搞',
    whyHard: "重新打包、重新上传、害怕出错、太费时间",
    solution: "改完再发一次，自动更新，不用重新折腾",
  },
];

const steps = [
  {
    number: 1,
    title: "在 AI 工具里做你的产品",
    innerVoice: '"以前做完东西不知道怎么发出去，现在不用担心了"',
  },
  {
    number: 2,
    title: "告诉 AI，帮你发布",
    innerVoice: '"真的说一声就发出去了？太神奇了"',
  },
  {
    number: 3,
    title: "把链接发出去，等反馈回来",
    innerVoice: '"对方在手机上打开的那一下，我特别激动"',
  },
];

export function HomePage() {
  useEffect(() => {
    void trackTrialEvent("home_view");
  }, []);

  const { ref: compRef, isRevealed: compRevealed } =
    useScrollReveal<HTMLDivElement>();
  const { ref: demoRef, isRevealed: demoRevealed } =
    useScrollReveal<HTMLDivElement>();
  const { ref: stepsRef, isRevealed: stepsRevealed } =
    useScrollReveal<HTMLDivElement>();

  return (
    <div className="page home">
      {/* ── Nav ── */}
      <header className="site-nav">
        <div className="wrap site-nav-inner">
          <a className="brand" href="/" aria-label="DemoGo 首页">
            <BrandLogo />
          </a>
          <div className="nav-actions">
            <LinkButton href="login.html" variant="ghost">
              登录
            </LinkButton>
            <LinkButton
              href="login.html?mode=register&next=app.html%23upload"
              variant="primary"
            >
              免费开始
            </LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* ── Section 1: Hero ── */}
        <section className="hero">
          <div className="wrap hero-inner">
            <h1 className="hero-title">
              用 AI 做出来的产品
              <br />
              <span className="hero-title-em">做完就能发出去</span>
            </h1>
            <p className="hero-reassure">
              不用买域名&nbsp;&nbsp;·&nbsp;&nbsp;不用配服务器&nbsp;&nbsp;·&nbsp;&nbsp;不用学部署
            </p>
            <p className="hero-desc">
              一个链接，发给谁都能打开。还能看到谁看了、看了多久
            </p>
            <LinkButton
              href="login.html?mode=register&next=app.html%23agent"
              variant="primary"
              className="btn-lg hero-cta"
            >
              <Sparkles size={20} />
              <span>在 AI 工具里直接发布</span>
            </LinkButton>
            <p className="hero-trust">
              3,000+ 产品已上线&nbsp;&nbsp;·&nbsp;&nbsp;免费套餐可用&nbsp;&nbsp;·&nbsp;&nbsp;无技术门槛
            </p>

            {/* Chat mockup */}
            <div className="hero-terminal">
              <div className="terminal-chrome">
                <div className="terminal-dot" />
                <div className="terminal-dot" />
                <div className="terminal-dot" />
              </div>
              <div className="chat-body">
                <div className="chat-msg chat-msg-user">
                  <span className="chat-label">你</span>
                  <span>帮我把这个发出去</span>
                </div>
                <div className="chat-msg chat-msg-ai">
                  <span className="chat-label">AI</span>
                  <span>
                    好了！这是你的链接 ??
                    <br />
                    <span className="chat-link">demogo.cn/d/my-project</span>
                  </span>
                </div>
              </div>            </div>

<div className="hero-scroll-hint">
              <ChevronDown size={18} />
              <span>往下看怎么用</span>
            </div>
          </div>
        </section>

        {/* ── Section 2: Comparison ── */}
        <section className="home-compare">
          <div className="wrap">
            <div className="section-head center">
              <h2>不用懂技术，也能把产品发出去</h2>
              <p className="section-sub">
                其他方式要么太复杂，要么根本没法用
              </p>
            </div>
            <div
              ref={compRef}
              className={`three-col compare-grid scroll-reveal${compRevealed ? " is-revealed" : ""}`}
            >
              {comparisonCards.map((card) => (
                <article className="compare-card" key={card.worry}>
                  <card.icon size={24} className="compare-icon" />
                  <h3 className="compare-worry">{card.worry}</h3>
                  <p className="compare-hard">{card.whyHard}</p>
                  <div className="compare-solution">
                    <span className="compare-solution-label">DemoGo</span>
                    <p>{card.solution}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: AI Deploy Demo ── */}
        <section className="home-demo">
          <div className="wrap">
            <div className="section-head center">
              <h2>发布，就是一句话的事</h2>
              <p className="section-sub">
                你已经在用 Cursor 写代码了，发布也只需要跟 AI 说一声
              </p>
            </div>
            <div
              ref={demoRef}
              className={`demo-showcase scroll-reveal${demoRevealed ? " is-revealed" : ""}`}
            >
              <div className="demo-left">
                <div className="demo-terminal">
                  <div className="terminal-chrome">
                    <div className="terminal-dot" />
                    <div className="terminal-dot" />
                    <div className="terminal-dot" />
                  </div>
                  <div className="chat-body">
                    <div className="chat-msg chat-msg-user">
                      <span className="chat-label">你</span>
                      <span>帮我把这个项目发出去</span>
                    </div>
                    <div className="chat-msg chat-msg-ai">
                      <span className="chat-label">AI</span>
                      <span>好的 ??</span>
                    </div>
                    <div className="chat-msg chat-msg-ai">
                      <span className="chat-label">AI</span>
                      <span>正在为你准备...</span>
                    </div>
                    <div className="chat-msg chat-msg-ai">
                      <span className="chat-label">AI</span>
                      <span>
                        好了！这是你的链接 ??
                        <br />
                        <span className="chat-link">demogo.cn/d/my-app</span>
                      </span>
                    </div>
                    <div className="chat-msg chat-msg-ai">
                      <span className="chat-label">AI</span>
                      <span>复制发给别人就能打开了</span>
                    </div>
                  </div>
                </div>
              <p className="demo-caption">跟 AI 说一声就行</p>
            </div>

              <div className="demo-arrow">
                <ArrowRight size={36} />
              </div>
              <div className="demo-right">
                <div className="demo-browser">
                  <div className="preview-browser-bar">
                    <div className="preview-dot" />
                    <div className="preview-dot" />
                    <div className="preview-dot" />
                    <div className="preview-url-text">demogo.cn/d/my-app</div>
                  </div>
                  {/* Demo page mockup */}
                  <div className="preview-body preview-demo-page">
                    <div className="demo-page-nav">
                      <span className="demo-page-logo">? 我的作品</span>
                      <span className="demo-page-nav-link">首页</span>
                      <span className="demo-page-nav-link">关于</span>
                    </div>
                    <div className="demo-page-hero">
                      <div className="demo-page-title">欢迎来到我的第一个产品</div>
                      <div className="demo-page-sub">这是用 AI 帮我做的，希望你喜欢</div>
                    </div>
                    <div className="demo-page-cards">
                      <div className="demo-page-card">
                        <div className="demo-card-icon">??</div>
                        <div className="demo-card-title">功能一</div>
                        <div className="demo-card-desc">简单实用的功能介绍</div>
                      </div>
                      <div className="demo-page-card">
                        <div className="demo-card-icon">??</div>
                        <div className="demo-card-title">功能二</div>
                        <div className="demo-card-desc">帮用户解决问题</div>
                      </div>
                    </div>
                    <div className="demo-page-footer">
                      ? 2025 我的作品
                    </div>
                  </div>
                </div>
                <p className="demo-caption">一句话，链接就到手了</p>
              </div>
            </div>
            <p className="demo-tools">
              支持 Cursor&nbsp;&nbsp;·&nbsp;&nbsp;Windsurf&nbsp;&nbsp;·&nbsp;&nbsp;Codex&nbsp;&nbsp;·&nbsp;&nbsp;Claude Code
            </p>
          </div>
        </section>

        {/* ── Section 4: Steps ── */}
        <section className="home-steps">
          <div className="wrap">
            <div className="section-head center">
              <h2>三步，就三步</h2>
            </div>
            <div
              ref={stepsRef}
              className={`steps-inner scroll-reveal${stepsRevealed ? " is-revealed" : ""}`}
            >
              {steps.map((step) => (
                <div className="step-item" key={step.number}>
                  <div className="step-number">
                    {String(step.number).padStart(2, "0")}
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-voice">{step.innerVoice}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: Trust ── */}
        <section className="home-trust">
          <div className="wrap">
            <div className="section-head center">
              <h2>你不是一个人</h2>
              <p className="section-sub">
                已经有很多跟你一样的创作者在用了
              </p>
            </div>
            <div className="trust-metrics">
              <div className="trust-item">
                <div className="trust-number">3,000+</div>
                <div className="trust-label">产品已上线</div>
              </div>
              <div className="trust-item">
                <div className="trust-number">&lt; 3 分钟</div>
                <div className="trust-label">平均发布时长</div>
              </div>
              <div className="trust-item">
                <div className="trust-number">免费</div>
                <div className="trust-label">入门套餐</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 6: CTA ── */}
        <section className="home-cta">
          <div className="wrap home-cta-inner">
            <h2>把你的产品发出去</h2>
            <p className="cta-reassure">
              不需要技术背景。不需要信用卡。
              <br />
              免费套餐够你把产品发出去、收到反馈。
            </p>
            <LinkButton
              href="login.html?mode=register&next=app.html%23agent"
              variant="primary"
              className="btn-xl"
            >
              <Sparkles size={20} />
              <span>免费发布</span>
            </LinkButton>
            <p className="cta-plan-info">
              免费套餐包含：1 个项目 · 1 条试用链接 · 基础反馈收集
            </p>
            <p className="cta-upgrade-contact">
              需要更多额度？升级 Lite / Pro 套餐请联系客服微信 <strong>demogocn</strong> · 邮箱 <strong>hello@demogo.cn</strong>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="wrap home-footer-inner">
          <div className="footer-brand">
            <BrandLogo />
            <p>让作品连接真实世界</p>
          </div>
          <div className="footer-links">
            <div className="legal-links">
              <a href="terms.html">服务条款</a>
              <a href="privacy.html">隐私政策</a>
              <a href="content-policy.html">内容政策</a>
              <a href="mailto:hello@demogo.cn">联系我们</a>
              <IcpLink />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
