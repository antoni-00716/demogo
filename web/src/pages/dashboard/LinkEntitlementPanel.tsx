import { useState } from "react";
import type { Demo, User, SubdomainRequest } from "../../types";
import { planRank } from "../../config/plans";
import { Button } from "../../components/Button";
import { SubdomainRequestStatus } from "../../components/dashboard/DashPanels";

function getDemoGoApiBase() { return ""; }


export function LinkEntitlementPanel({
  demo,
  user,
  onUpdateSlug,
  onCreateSubdomainRequest,
  subdomainRequests
}: {
  demo: Demo;
  user: User;
  onUpdateSlug: (demo: Demo, slug: string) => void;
  onCreateSubdomainRequest: (demo: Demo, subdomain: string) => void;
  subdomainRequests: SubdomainRequest[];
}) {
  const [slug, setSlug] = useState(demo.slug || "");
  const [subdomain, setSubdomain] = useState((demo.slug || "").replace(/^try-[a-f0-9]+$/, ""));
  const canEditSlug = planRank(user.plan) >= planRank("lite");
  const canRequestSubdomain = user.plan === "pro";
  const demoRequests = subdomainRequests
    .filter((request) => request.demoId === demo.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const latestRequest = demoRequests[0] || null;

  return (
    <div className="link-entitlement-panel">
      <div className="section-mini-head">
        <div>
          <h3>链接权益</h3>
          <p>首次生成统一使用随机链接；Lite 和 Pro 可以在这里把链接改得更适合分享。</p>
        </div>
      </div>
      <div className="link-control-grid">
        <div>
          <strong>自定义链接后缀</strong>
          <p>{canEditSlug ? "保存后，新链接立即生效，旧链接会自动跳转。" : "Free 暂不支持修改链接后缀，升级 Lite 后可使用。"}</p>
          <div className="inline-input-action">
            <span>{getDemoGoApiBase()}/d/</span>
            <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={!canEditSlug} placeholder="my-demo" />
            <Button onClick={() => onUpdateSlug(demo, slug)} disabled={!canEditSlug || !slug || slug === demo.slug}>保存</Button>
          </div>
        </div>
        <div>
          <strong>专属二级域名</strong>
          <p>{canRequestSubdomain ? "提交后由管理员审核，DNS 和证书配置完成后可访问。" : "Pro 权益，可申请 xxx.demogo.cn。"}</p>
          <div className="inline-input-action">
            <input className="input" value={subdomain} onChange={(event) => setSubdomain(event.target.value)} disabled={!canRequestSubdomain} placeholder="my-demo" />
            <span>.demogo.cn</span>
            <Button onClick={() => onCreateSubdomainRequest(demo, subdomain)} disabled={!canRequestSubdomain || !subdomain}>申请</Button>
          </div>
          {latestRequest ? <SubdomainRequestStatus request={latestRequest} /> : null}
        </div>
      </div>
    </div>
  );
}
