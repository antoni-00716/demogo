import { Badge } from "../components/Badge";
import { BrandLogo } from "../components/BrandLogo";
import { LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { IcpLink } from "../components/IcpLink";
import { plans } from "../config/plans";

const audienceTags = ["活动报名", "课程招生", "作品集", "产品原型", "客户演示"];

const heroPromises = [
  ["别人能打开", "不用发截图和压缩包，客户、同事、学员点开链接就能看。"],
  ["表单能收回", "报名、预约、留言这类基础信息，可以先进入你的工作台。"],
  ["发出前先看一遍", "DemoGo 会先检查页面是否适合公开试用，减少尴尬和风险。"]
];

const painPoints = [
  ["只能发截图", "截图和录屏只能看，别人不能点击、填写，也很难给出真实反馈。"],
  ["本地打不开", "AI 已经帮你做出了页面，但客户、同事、学员打不开你的本地文件。"],
  ["表单没人收", "页面看起来能填，但提交后如果没有地方保存，就没法真正验证。"],
  ["不敢直接发", "发出去前需要先知道：这个页面适合试用，还是需要先让 AI 调整。"]
];

const workflow = [
  ["01", "上传 AI 做好的页面", "把项目打成 .zip、.tar.gz 或 .tgz，也可以让 AI 工具帮你发布。"],
  ["02", "先检查再生成", "DemoGo 会查看首页、文件结构、基础表单和页面内容。"],
  ["03", "拿到正式试用链接", "得到一个 https://demogo.cn/d/... 链接，直接发给别人试。"],
  ["04", "看反馈再决定投入", "别人打开、填写、留言后，你再决定要不要继续完善。"]
];

const scenarios = [
  ["活动报名页", "先发给目标人群试跑，确认页面、文案和报名表是否有效。"],
  ["培训招生页", "课程介绍、咨询留言、报名留资可以先小范围验证。"],
  ["产品原型", "让客户直接点开操作，比截图、录屏和口头描述更容易收反馈。"],
  ["个人作品集", "把 AI 做好的作品集变成一个可分享的正式链接。"],
  ["课程作业", "学员交付可访问链接，老师查看、点评和互评更方便。"],
  ["内部演示页", "把流程页、数据页、轻量管理页快速发给团队试用。"]
];

const proofPoints = ["正式域名 demogo.cn", "已完成 ICP 备案", "发布前内容检查", "基础表单收集"];

const supportCards = [
  {
    title: "适合现在就试",
    tone: "success",
    items: [
      "活动页、报名页、招生页、作品集、宣传页",
      "AI 工具已经导出的网页文件",
      "能生成网页版本的 React、Vue、Vite 项目",
      "报名、预约、留资、留言等基础表单",
      ".zip、.tar.gz、.tgz 项目包"
    ]
  },
  {
    title: "建议先调整后再试",
    tone: "warning",
    items: [
      "必须依赖完整登录、支付、订单才能使用的应用",
      "需要长期运行后台服务或数据库的系统",
      "需要短信、微信支付、第三方接口才能完成核心流程",
      "只有源码但生成不出网页版本的项目",
      "复杂管理后台或多人协作业务系统"
    ]
  }
];

const faqItems = [
  ["DemoGo 最适合解决什么问题？", "最适合把 AI 做好的页面快速发给别人试用。你不需要先折腾服务器，先拿到一个能打开、能转发、能收基础表单的链接。"],
  ["有报名、预约、留言表单的页面能用吗？", "基础表单可以先用。DemoGo 会尽量识别页面里的表单，并把提交记录收进工作台。复杂登录、支付、订单和完整后台暂不适合当前版本。"],
  ["和专业部署平台有什么区别？", "专业部署平台更完整，也更适合工程团队。DemoGo 当前更聚焦非技术用户的试用验证：让页面先被真实用户打开、填写和反馈。"],
  ["如果生成失败怎么办？", "工作台会给出失败原因和给 AI 工具的修改说明。你可以把说明交给 Codex、Cursor、Claude Code 等工具，让它调整后重新上传。"]
];

export function HomePage() {
  return (
    <div className="page home-page">
      <header className="site-nav">
        <div className="wrap site-nav-inner">
          <a className="brand" href="/">
            <BrandLogo />
          </a>
          <nav className="nav-links" aria-label="首页导航">
            <a href="#flow">流程</a>
            <a href="#scenarios">场景</a>
            <a href="#support">适合什么</a>
            <a href="#pricing">套餐</a>
          </nav>
          <div className="nav-actions">
            <LinkButton href="login.html?next=app.html" variant="ghost">登录</LinkButton>
            <LinkButton href="login.html?next=app.html%23upload" variant="primary">立即试用</LinkButton>
          </div>
        </div>
      </header>

      <main>
        <section className="home-hero">
          <div className="wrap home-hero-inner">
            <div className="home-hero-copy">
              <div className="hero-eyebrow-line">
                <Badge tone="success">AI 页面试用链接</Badge>
                <span>把作品从电脑里发出去</span>
              </div>
              <h1>别只发截图，把 AI 做好的页面变成试用链接</h1>
              <p className="hero-subtitle">
                客户、同事、学员点开就能看；有报名、预约、留言，也可以先收进工作台。
              </p>
              <p className="hero-copy-note">
                适合活动页、报名页、作品集、产品原型和客户演示。先让真实用户试一次，再决定下一步是否继续投入。
              </p>
              <div className="home-actions">
                <LinkButton href="login.html?next=app.html%23upload" variant="primary">立即生成试用链接</LinkButton>
                <LinkButton href="#scenarios">看看适合哪些页面</LinkButton>
              </div>
              <div className="audience-pills">
                {audienceTags.map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className="home-proof-strip" aria-label="平台可信信息">
                {proofPoints.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
            <HeroProductPreview />
          </div>
          <div className="wrap hero-promise-grid">
            {heroPromises.map(([title, text]) => (
              <div className="hero-promise-card" key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section problem-section" id="problem">
          <div className="wrap problem-layout">
            <div className="section-head">
              <span className="section-kicker">为什么需要</span>
              <h2>AI 已经帮你做出页面，最后一步是让别人真正点开试。</h2>
              <p className="lead">
                DemoGo 补上从“本地文件”到“真实试用”的关键一步，让页面不只停留在截图和演示视频里。
              </p>
            </div>
            <div className="pain-rail">
              {painPoints.map(([title, text]) => (
                <div className="pain-row" key={title}>
                  <span>{title.slice(0, 4)}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="flow">
          <div className="wrap">
            <div className="section-head wide">
              <span className="section-kicker">使用流程</span>
              <h2>不用先研究服务器，先把页面发出去试。</h2>
              <p className="lead">DemoGo 的流程围绕一个目标：让页面快速进入真实试用，而不是停在本地文件里。</p>
            </div>
            <div className="flow-board">
              {workflow.map(([index, title, text]) => (
                <div className="flow-step" key={title}>
                  <span>{index}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="forms">
          <div className="wrap inspect-layout">
            <div className="inspect-console">
              <div className="console-topbar">
                <span />
                <span />
                <span />
                <strong>生成结果预览</strong>
              </div>
              <div className="console-line success">首页已找到，可以打开</div>
              <div className="console-line success">报名表已识别：姓名、手机号、留言</div>
              <div className="console-line success">提交记录会进入工作台</div>
              <div className="console-line warning">登录、支付、订单能力需要后续版本支持</div>
              <div className="console-result">
                <strong>适合生成试用链接</strong>
                <p>你可以先把链接发给客户、同事或学员，收集真实访问、填写和反馈。</p>
              </div>
            </div>
            <div className="section-head">
              <span className="section-kicker">不只是能打开</span>
              <h2>报名、预约、留言，也可以先收起来。</h2>
              <p className="lead">
                很多 AI 做出来的页面，真正要验证的是“有没有人愿意填”。DemoGo 会尽量把基础表单接到你的工作台里，让试用不止停留在观看。
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="scenarios">
          <div className="wrap">
            <div className="section-head wide">
              <span className="section-kicker">适合场景</span>
              <h2>这些页面，最适合先生成一个试用链接。</h2>
              <p className="lead">先让真实对象打开、点击、填写，再决定是否继续投入开发和运营。</p>
            </div>
            <div className="scenario-grid">
              {scenarios.map(([title, text]) => (
                <div className="scenario-row" key={title}>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="support">
          <div className="wrap support-layout">
            <div className="section-head">
              <span className="section-kicker">适合什么</span>
              <h2>先试适合 DemoGo 的页面，避免把复杂系统当成简单页面上传。</h2>
              <p className="lead">
                当前版本重点服务“页面试用”和“基础表单收集”。如果项目依赖完整后台、支付、订单或数据库，建议先让 AI 改成可单独打开的网页版本。
              </p>
            </div>
            <div className="support-card-grid">
              {supportCards.map((card) => (
                <div className={`support-card ${card.tone}`} key={card.title}>
                  <strong>{card.title}</strong>
                  <ul>
                    {card.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="pricing">
          <div className="wrap">
            <div className="section-head wide">
              <span className="section-kicker">套餐</span>
              <h2>先免费跑通第一条链接，再按试用节奏升级。</h2>
              <p className="lead">注册后即可按 Free 额度生成试用链接。需要更多在线项目和生成次数时，再申请 Lite 或 Pro。</p>
            </div>
            <div className="pricing-grid">
              {plans.map((plan) => (
                <Card className={`plan-card ${plan.code === "lite" ? "featured" : ""}`} key={plan.code}>
                  {plan.code === "lite" ? <span className="plan-ribbon">推荐试运营</span> : null}
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <ul>
                    <li>{plan.onlineDemos} 个在线试用项目</li>
                    <li>{plan.monthlyDeploys} 次生成/更新链接/月</li>
                    <li>试用项目保留 {plan.retentionDays} 天</li>
                    <li>{plan.linkBenefit}</li>
                  </ul>
                  <LinkButton href="login.html?next=app.html%23plan" variant={plan.code === "free" ? "secondary" : "primary"}>
                    {plan.code === "free" ? "开始使用 Free" : `申请 ${plan.name}`}
                  </LinkButton>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="wrap faq-wrap">
            <div className="section-head wide">
              <span className="section-kicker">常见问题</span>
              <h2>先把作品发出去，用真实反馈决定下一步。</h2>
            </div>
            <div className="faq-list">
              {faqItems.map(([question, answer]) => (
                <details className="faq-item" key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="wrap final-cta-inner">
            <span>从 AI 做好页面到别人真正试用，只差一个链接。</span>
            <h2>现在生成第一个试用链接。</h2>
            <LinkButton href="login.html?next=app.html%23upload" variant="primary">立即试用</LinkButton>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap site-footer-inner">
          <div>
            <BrandLogo />
            <p>让 AI 做好的页面，被真实用户打开、填写和反馈。</p>
          </div>
          <div className="footer-links">
            <a href="terms.html">条款</a>
            <a href="privacy.html">隐私政策</a>
            <a href="content-policy.html">内容政策</a>
            <IcpLink />
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroProductPreview() {
  return (
    <div className="hero-product-preview">
      <div className="preview-window-bar">
        <span />
        <span />
        <span />
        <strong>试用链接生成中</strong>
      </div>
      <div className="preview-upload-box">
        <span className="preview-upload-icon">↑</span>
        <div>
          <strong>上传项目包</strong>
          <small>支持 .zip / .tar.gz / .tgz，最大 50MB</small>
        </div>
      </div>
      <div className="preview-step-list">
        {workflow.map(([index, title, text]) => (
          <div className="preview-step" key={title}>
            <span>{index}</span>
            <div>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="preview-result">
        <div>
          <strong>链接已生成</strong>
          <small>可以发给别人试用，也能收报名和留言</small>
        </div>
        <button type="button">复制链接</button>
      </div>
    </div>
  );
}
