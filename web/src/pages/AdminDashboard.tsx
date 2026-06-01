import { useEffect, useState } from "react";
import {
  getAdminContentReviews,
  getAdminFeedback,
  getAdminForms,
  getAdminOverview,
  getAdminPlanRequests,
  getAdminSubdomainRequests,
  getAdminUsers,
} from "../api/admin";
import { Button } from "../components/Button";
import { IcpLink } from "../components/IcpLink";
import { Toast } from "../components/Toast";
import type { AdminMetrics, AdminUser, ContentReview, Demo, Feedback, FormSubmission, HostedForm, PlanRequest, SubdomainRequest } from "../types";
import { AdminSidebar, type AdminView } from "./admin/AdminSidebar";
import { adminViewTitle, adminViewSubtitle, resolveInitialAdminView } from "./admin/adminViewHelpers";
import { AdminOverviewView } from "./admin/AdminOverviewView";
import { PlanRequestsAdmin, SubdomainRequestsAdmin } from "./admin/AdminPlanRequests";
import { AdminDemoList, AdminRuntimeOps } from "./admin/AdminDemosView";
import { AdminFeedback } from "./admin/AdminFeedback";
import { AdminForms } from "./admin/AdminForms";
import { AdminContentReviews } from "./admin/AdminContentReviews";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminSettings } from "./admin/AdminSettings";

type ToastTone = "info" | "success" | "warning" | "danger";

export function AdminDashboard() {
  const [activeView, setActiveView] = useState<AdminView>(() => resolveInitialAdminView());
  const [metrics, setMetrics] = useState<AdminMetrics>({});
  const [demos, setDemos] = useState<Demo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [subdomainRequests, setSubdomainRequests] = useState<SubdomainRequest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [forms, setForms] = useState<HostedForm[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [contentReviews, setContentReviews] = useState<ContentReview[]>([]);
  const [runtimeDemos, setRuntimeDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ToastTone>("info");

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [overview, usersPayload, requestsPayload, subdomainPayload, feedbackPayload, formsPayload, contentReviewsPayload] = await Promise.all([
          getAdminOverview(),
          getAdminUsers(),
          getAdminPlanRequests(),
          getAdminSubdomainRequests(),
          getAdminFeedback(),
          getAdminForms(),
          getAdminContentReviews()
        ]);
        if (!mounted) return;
        setMetrics(overview.metrics || {});
        setDemos(overview.demos || []);
        setUsers(usersPayload.users || overview.users || []);
        setRequests(requestsPayload.requests || []);
        setSubdomainRequests(subdomainPayload.requests || []);
        setFeedback(feedbackPayload.feedback || overview.feedback || []);
        setForms(formsPayload.forms || overview.forms || []);
        setFormSubmissions(formsPayload.submissions || []);
        setContentReviews(contentReviewsPayload.reviews || overview.contentReviews || []);
        setRuntimeDemos((overview.demos || []).filter((demo: Demo) => demo.hostingMode === "node_runtime" || demo.database?.enabled));
      } catch (error) {
        if (mounted) show(error instanceof Error ? error.message : "运营后台数据加载失败。", "danger");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  function show(text: string, nextTone: ToastTone = "info") {
    setMessage(text);
    setTone(nextTone);
  }

  async function loadAll() {
    try {
      const [overview, usersPayload, requestsPayload, subdomainPayload, feedbackPayload, formsPayload, contentReviewsPayload] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminPlanRequests(),
        getAdminSubdomainRequests(),
        getAdminFeedback(),
        getAdminForms(),
        getAdminContentReviews()
      ]);
      setMetrics(overview.metrics || {});
      setDemos(overview.demos || []);
      setUsers(usersPayload.users || overview.users || []);
      setRequests(requestsPayload.requests || []);
      setSubdomainRequests(subdomainPayload.requests || []);
      setFeedback(feedbackPayload.feedback || overview.feedback || []);
      setForms(formsPayload.forms || overview.forms || []);
      setFormSubmissions(formsPayload.submissions || []);
      setContentReviews(contentReviewsPayload.reviews || overview.contentReviews || []);
      setRuntimeDemos((overview.demos || []).filter((demo: Demo) => demo.hostingMode === "node_runtime" || demo.database?.enabled));
    } catch (error) {
      show(error instanceof Error ? error.message : "运营后台数据加载失败。", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function refreshOverview() {
    const overview = await getAdminOverview();
    setMetrics(overview.metrics || {});
    setDemos(overview.demos || []);
  }

  if (loading) {
    return <div className="page-loading">正在加载 DemoGo 运营后台...</div>;
  }

  return (
    <div className="app-shell admin-shell">
      <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1>{adminViewTitle(activeView)}</h1>
            <p>{adminViewSubtitle(activeView)}</p>
          </div>
          <div className="nav-actions">
            <Button onClick={loadAll}>刷新数据</Button>
            <Button variant="primary" onClick={() => window.location.href = "/"}>返回首页</Button>
          </div>
        </div>
        {message ? <Toast message={message} tone={tone} /> : null}
        {activeView === "overview" ? (
          <AdminOverviewView metrics={metrics} demos={demos} users={users} requests={requests} feedback={feedback} forms={forms} contentReviews={contentReviews} setActiveView={setActiveView} />
        ) : null}
        {activeView === "requests" ? (
            <PlanRequestsAdmin
              requests={requests}
              onChanged={async (text) => {
                show(text, "success");
                const payload = await getAdminPlanRequests();
                setRequests(payload.requests || []);
                const usersPayload = await getAdminUsers();
                setUsers(usersPayload.users || []);
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "subdomains" ? (
            <SubdomainRequestsAdmin
              requests={subdomainRequests}
              onChanged={async (text) => {
                show(text, "success");
                const payload = await getAdminSubdomainRequests();
                setSubdomainRequests(payload.requests || []);
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "demos" ? (
            <AdminDemoList
              demos={demos}
              onChanged={async (text) => {
                show(text, "success");
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "runtime" ? (
            <AdminRuntimeOps
              metrics={metrics}
              initialDemos={runtimeDemos}
              onChanged={async (text) => {
                show(text, "success");
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "feedback" ? (
            <AdminFeedback
              feedback={feedback}
              onChanged={async (text) => {
                show(text, "success");
                const payload = await getAdminFeedback();
                setFeedback(payload.feedback || []);
                await refreshOverview();
              }}
              onError={(text) => show(text, "danger")}
            />
        ) : null}
        {activeView === "forms" ? <AdminForms forms={forms} submissions={formSubmissions} /> : null}
        {activeView === "reviews" ? <AdminContentReviews reviews={contentReviews} onHandled={loadAll} show={show} /> : null}
        {activeView === "users" ? <AdminUsers users={users} /> : null}
        {activeView === "settings" ? <AdminSettings /> : null}
        <footer className="app-footer">
          <span>DemoGo 运营后台</span>
          <IcpLink />
        </footer>
      </main>
    </div>
  );
}



