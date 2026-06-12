import { useEffect } from "react";
import { trackTrialEvent } from "../api/trialEvents";

// ── Data ──

const painPoints = [
  {
    q: '"发给别人就是打不开"',
    a: "你电脑上能正常运行，换台电脑就报错，总不能让所有人都装一堆软件。",
  },
  {
    q: '"不知道怎么变成可访问的链接"',
    a: "听说要部署到服务器，但那些技术术语你根本看不懂。",
  },
  {
    q: '"最后只能发个截图"',
    a: "别人看不到完整的交互效果，你的想法等于没说清楚。",
  },
];

interface SellItem {
  visual: string;
  heading: string;
  text: string;
  highlight: string | null;
  tags: string[];
  altBg: boolean;
  reverse: boolean;
}

const sells: SellItem[] = [
  {
    visual: "⚡",
    heading: "AI里做完作品，<br />说句话，链接就有了。",
    text: "在 Claude Code、OpenClaw 里实现完你的想法，直接说「用 DemoGo 生成链接」。不用下载、不用切窗口、不用开新网页，全程自动完成。",
    highlight: "你只管想创意，链接的事交给我们。",
    tags: ["AI一句话生成", "无缝对接", "零操作"],
    altBg: false,
    reverse: false,
  },
  {
    visual: "🔗",
    heading: "拖进本地文件，<br />3秒生成分享链接。",
    text: "已经下载到桌面的作品，直接拖拽至平台即可。不用管任何技术细节，所有后台处理自动完成。",
    highlight: "从拖进去到拿到链接，真的只要3秒。",
    tags: ["拖拽生成", "秒出链接", "全自动"],
    altBg: true,
    reverse: true,
  },
  {
    visual: "🛠️",
    heading: "发一个链接，<br />所有人点开就能体验。",
    text: "分享到微信、钉钉、群聊，点击即可看到你的完整创意。对方不用注册、不用下载、不用问你怎么弄，打开就能用。",
    highlight: "生成即分享，点开即体验。",
    tags: ["即开即用", "无需注册", "全平台兼容"],
    altBg: false,
    reverse: false,
  },
];

const whoCards = [
  { icon: "📱", title: "产品经理", desc: "生成原型链接，让客户体验你的产品想法" },
  { icon: "🎨", title: "设计师", desc: "生成页面链接，让甲方看到你的设计效果" },
  { icon: "📣", title: "运营人员", desc: "生成活动链接，让同事快速参与测试" },
  { icon: "🚀", title: "创业者", desc: "生成Demo链接，让投资人看懂你的项目" },
  { icon: "📚", title: "教育工作者", desc: "生成互动课件链接，让学生在线体验学习" },
  { icon: "🤖", title: "AI爱好者", desc: "生成作品链接，让朋友体验你的趣味创意" },
];

const scenes = [
  { icon: "📋", text: "客户演示", sub: "生成链接，当场演示你的产品想法" },
  { icon: "👥", text: "团队评审", sub: "生成链接，全员一起评审交互效果" },
  { icon: "📱", text: "社群测试", sub: "生成链接，收集大家的体验反馈" },
  { icon: "🎯", text: "作品集展示", sub: "生成链接，让面试官看到你的实力" },
];

const cmpRows = [
  { label: "耗时", self: "30分钟~2小时，还可能搞不定", dg: "3秒生成可分享链接" },
  { label: "技术要求", self: "需掌握服务器、部署等专业知识", dg: "无需任何技术基础" },
  { label: "对方体验", self: "需一步步教别人怎么安装使用", dg: "点击链接就能直接体验" },
  { label: "综合成本", self: "服务器费+大量时间成本", dg: "基础功能永久免费" },
  { label: "展示效果", self: "静态截图或无法正常运行", dg: "完整可交互的创意作品" },
  { label: "数据反馈", self: "完全不知道谁看过", dg: "自动统计链接访问数据" },
];

const metrics = [
  { num: "500", suffix: "+", label: "和你一样的创意者已加入" },
  { num: "2,300", suffix: "+", label: "本周生成的创意分享链接" },
  { num: "97", suffix: "%", label: "用户表示分享效率提升10倍以上" },
];

export function HomePage() {
  useEffect(() => {
    void trackTrialEvent("home_view");
  }, []);

  return (
    <>
      {/* ── Nav ── */}
      <nav className="nav">
        <span className="nav-logo">
          <span className="mark">◆</span>DemoGo
        </span>
        <div className="nav-links">
          <a href="#pain">我能用吗</a>
          <a href="#sell">怎么用</a>
          <a href="login.html?mode=register" className="cta">
            免费试用
          </a>
        </div>
      </nav>

      <main>
        {/* ═══════════════════════════════════════════
            LAYER 1: Hero
        ═══════════════════════════════════════════ */}
        <section className="hero" id="hero">
          <div className="hero-inner">
            <h1>
              用AI做完了创意作品，怎么让别人用上？<br />
              <span className="accent-text">用 DemoGo 一键分享。</span>
            </h1>
            <p className="sub">
              在 Claude Code 或 OpenClaw 里做完作品，说一句「用 DemoGo 生成链接」。不用部署、不用服务器、不用备案，3秒出链接，任何人点击就能体验你的创意。
            </p>
            <div className="hero-ctas">
              <a className="btn-pill primary" href="login.html?mode=register">
                免费生成我的链接
              </a>
              <a className="btn-pill secondary" href="#pain">
                往下看就懂 ↓
              </a>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            LAYER 2: 痛点
        ═══════════════════════════════════════════ */}
        <section className="section-alt" id="pain" aria-label="痛点场景">
          <div className="section-inner">
            <h2 className="sec-title">分享你的AI创意，是不是总卡在最后一步？</h2>
            <p className="sec-body sec-body--narrow">
              熬了好久把想法变成了现实，却没法让别人真正体验到。
            </p>
            <div className="pain-grid">
              {painPoints.map((p, i) => (
                <div className="pain-card" key={i}>
                  <div className="pain-q">{p.q}</div>
                  <div className="pain-a">{p.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            LAYER 3: 三大核心价值
        ═══════════════════════════════════════════ */}
        {sells.map((s, i) => (
          <section
            key={i}
            className={`sell${s.altBg ? " section-alt" : ""}`}
            id={i === 0 ? "sell" : undefined}
          >
            <div className="sell-inner">
              {s.reverse ? (
                <>
                  <div>
                    <h2 dangerouslySetInnerHTML={{ __html: s.heading }} />
                    <p>{s.text}</p>
                    {s.highlight && (
                      <p className="sell-highlight">{s.highlight}</p>
                    )}
                    <div className="sell-tags">
                      {s.tags.map((t) => (
                        <span key={t} className="sell-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="sell-visual" aria-hidden="true">
                    {s.visual}
                  </div>
                </>
              ) : (
                <>
                  <div className="sell-visual" aria-hidden="true">
                    {s.visual}
                  </div>
                  <div>
                    <h2 dangerouslySetInnerHTML={{ __html: s.heading }} />
                    <p>{s.text}</p>
                    {s.highlight && (
                      <p className="sell-highlight">{s.highlight}</p>
                    )}
                    <div className="sell-tags">
                      {s.tags.map((t) => (
                        <span key={t} className="sell-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        ))}

        {/* ═══════════════════════════════════════════
            LAYER 4: 决策收口
        ═══════════════════════════════════════════ */}

        {/* 谁适合用 */}
        <section className="section-alt" id="close" aria-label="适合人群">
          <div className="section-inner">
            <h2 className="sec-title">只要你用AI实现创意，就能用DemoGo</h2>
            <p className="sec-body sec-body--narrow">
              你不用会写代码，不用懂任何技术。
              只要你用AI把想法变成了原型、页面、工具或任何可运行的作品，需要分享给别人。
              说一句话或者拖一下文件，3秒就能搞定。
            </p>
            <div className="who-grid">
              {whoCards.map((w, i) => (
                <div className="who-card" key={i}>
                  <div className="who-icon" aria-hidden="true">
                    {w.icon}
                  </div>
                  <div className="who-title">{w.title}</div>
                  <div className="who-desc">{w.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 使用场景 */}
        <section aria-label="使用场景">
          <div className="section-inner">
            <h2 className="sec-title">这些场景，一键生成链接就能搞定</h2>
            <div className="scene-grid">
              {scenes.map((sc, i) => (
                <div className="scene-item" key={i}>
                  <span className="scene-icon" aria-hidden="true">
                    {sc.icon}
                  </span>
                  <div>
                    <div className="scene-text">{sc.text}</div>
                    <div className="scene-sub">{sc.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 方案对比 */}
        <section className="section-alt" aria-label="方案对比">
          <div className="section-inner">
            <h2 className="sec-title">两种分享方式，差别有多大</h2>
            <div className="cmp-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th />
                    <th>传统分享方式</th>
                    <th>使用 DemoGo</th>
                  </tr>
                </thead>
                <tbody>
                  {cmpRows.map((row, i) => (
                    <tr key={i}>
                      <td className="cmp-highlight">{row.label}</td>
                      <td className="cmp-dim">{row.self}</td>
                      <td>
                        <span className="cmp-check">✓</span> {row.dg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 用户数据 */}
        <section aria-label="用户数据">
          <div className="section-inner">
            <h2 className="sec-title">已有500+创意者选择DemoGo</h2>
            <div className="metric-row">
              {metrics.map((m, i) => (
                <div className="metric" key={i}>
                  <div className="metric-num">
                    <span className="num-accent">{m.num}</span>
                    {m.suffix}
                  </div>
                  <div className="metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 立即开始 */}
        <section className="section-alt sec-cta">
          <div className="section-inner">
            <h2 className="sec-title">
              用AI实现想法，<br />
              用DemoGo分享创意。
            </h2>
            <p className="sec-body sec-body--narrow cta-sub">
              免费试用，无需注册，用完即走，无任何附加条件。
            </p>
            <div className="cta-btn-wrap">
              <a className="btn-pill primary" href="login.html?mode=register">
                免费生成我的第一个链接
              </a>
            </div>
            <p className="cta-note">支持 Claude Code、OpenClaw 一句话生成链接 · 本地文件拖拽生成 · 无需服务器/域名/备案</p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-name">
              <span className="mark">◆</span>DemoGo
            </div>
            <p className="footer-tagline">让你的每一个创意，都能被更多人体验到。</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>产品</h4>
              <a href="#">功能介绍</a>
              <a href="#">定价方案</a>
              <a href="#">更新日志</a>
            </div>
            <div className="footer-col">
              <h4>资源</h4>
              <a href="/terms.html">服务条款</a>
              <a href="/privacy.html">隐私政策</a>
              <a href="/content-policy.html">内容政策</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 DemoGo. 鄂ICP备2026023999号</span>
          <span>hello@demogo.cn</span>
        </div>
      </footer>
    </>
  );
}
