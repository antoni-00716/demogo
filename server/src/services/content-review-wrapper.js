// DemoGo v0.9.3 - Content review wrapper functions (extracted from server.js)
import crypto from "node:crypto";
import { reviewArchiveContent, reviewDirectoryContent, contentReviewStatusLabel } from "./content-review-service.js";
import { readArchiveEntryText } from "../lib/archive-utils.js";

export function createContentReviewWrappers(deps) {
  const {
    readJson, writeJson, contentReviewsFile,
    contentReviewMode, contentReviewMaxTextBytes,
    contentReviewExternalEndpoint, contentReviewExternalToken
  } = deps;

  function mergeContentReviews(sourceReview, outputReview) {
    const source = sourceReview || {};
    const output = outputReview || {};
    const findings = [
      ...(Array.isArray(source.findings) ? source.findings : []),
      ...(Array.isArray(output.findings) ? output.findings : [])
    ];
    const worstStatus = (
      source.status === "failed" || output.status === "failed" ? "failed" :
      source.status === "review" || output.status === "review" ? "review" :
      source.status === "passed" || output.status === "passed" ? "passed" :
      "pending"
    );
    return {
      ...source,
      ...output,
      findings,
      status: worstStatus,
      statusLabel: contentReviewStatusLabel(worstStatus),
      summary: summarizeMergedContentReview(worstStatus, findings)
    };
  }

  function summarizeMergedContentReview(status, findings) {
    const count = Array.isArray(findings) ? findings.length : 0;
    if (status === "passed") return "内容安全检查已通过";
    if (status === "failed") return `内容安全检查未通过，发现 ${count} 个问题`;
    if (status === "review") return "内容安全检查需要人工复核";
    return "内容安全检查状态未知";
  }

  function defaultContentReviewResolutionStatus(status) {
    if (status === "failed") return "pending_review";
    if (status === "review") return "pending_review";
    return "auto_cleared";
  }

  function createContentReviewFixPrompt(review) {
    if (!review || review.status === "passed") return "";
    const findings = Array.isArray(review.findings) ? review.findings : [];
    if (!findings.length) return "";
    const items = findings.map((f, i) => `${i + 1}. ${f.message || f}`).join("\n");
    return `内容安全检查发现以下问题，请修改后重新发布：\n${items}`;
  }

  function contentReviewUserSummary(review) {
    if (!review) return "";
    if (review.status === "passed") return "内容安全检查已通过";
    if (review.status === "failed") return "内容安全检查未通过，请根据 AI 修复提示修改后重新发布";
    if (review.status === "review") return "内容安全检查需要人工复核，请耐心等待";
    return "";
  }

  async function persistContentReview(record) {
    const reviews = await readJson(contentReviewsFile, []);
    const index = reviews.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      reviews[index] = record;
    } else {
      reviews.push(record);
    }
    await writeJson(contentReviewsFile, reviews.slice(0, 2000));
  }

  async function createAndPersistContentReview(context) {
    const sourceReview = await reviewArchiveContent(context.analysis, {
      mode: contentReviewMode,
      maxTextBytes: contentReviewMaxTextBytes,
      externalEndpoint: contentReviewExternalEndpoint,
      externalToken: contentReviewExternalToken,
      id: crypto.randomUUID(),
      readText: readArchiveEntryText
    });
    const outputReview = context.targetDir
      ? await reviewDirectoryContent(context.targetDir, {
          mode: contentReviewMode,
          maxTextBytes: contentReviewMaxTextBytes,
          externalEndpoint: contentReviewExternalEndpoint,
          externalToken: contentReviewExternalToken,
          id: crypto.randomUUID()
        })
      : null;
    const review = mergeContentReviews(sourceReview, outputReview);
    const record = {
      ...review,
      id: review.id || crypto.randomUUID(),
      userId: context.user?.id || context.demo?.userId || null,
      userEmail: context.user?.email || context.demo?.userEmail || "",
      demoId: context.demo?.id || null,
      demoSlug: context.demo?.slug || "",
      deploymentId: context.deploymentId || null,
      action: context.action || "create",
      actorType: context.actor || "user",
      projectName: context.projectName || "",
      fileName: context.fileName || "",
      detectedType: context.inspection?.detectedType || "",
      canPublishBeforeReview: Boolean(context.inspection?.canPublish),
      resolutionStatus: defaultContentReviewResolutionStatus(review.status),
      adminNote: "",
      handledBy: "",
      handledAt: null
    };
    await persistContentReview(record);
    return record;
  }

  async function persistPreflightContentReview(context) {
    const review = context.inspection?.contentReview;
    if (!review || !review.status || review.status === "passed") return null;
    const record = {
      ...review,
      id: review.id || crypto.randomUUID(),
      userId: context.user?.id || null,
      userEmail: context.user?.email || "",
      demoId: context.demo?.id || null,
      demoSlug: context.demo?.slug || "",
      action: context.action || "create",
      actorType: context.actor || "user",
      resolutionStatus: defaultContentReviewResolutionStatus(review.status),
      adminNote: "",
      handledBy: "",
      handledAt: null
    };
    await persistContentReview(record);
    return record;
  }

  function attachContentReviewToInspection(inspection, review) {
    if (!inspection) return inspection;
    const blocked = review?.status === "failed" || review?.status === "review";
    return {
      ...inspection,
      contentReview: publicAdminContentReview(review),
      status: blocked ? "blocked" : inspection.status,
      canPublish: blocked ? false : inspection.canPublish,
      summary: blocked ? (review?.summary || "内容安全检查未通过") : inspection.summary,
      userSummary: blocked ? contentReviewUserSummary(review) : inspection.userSummary,
      ruleReport: {
        ...(inspection.ruleReport || {}),
        fixPrompt: createContentReviewFixPrompt(review) || (inspection.ruleReport || {}).fixPrompt
      }
    };
  }

  function publicAdminContentReview(review) {
    if (!review) return null;
    return {
      id: review.id,
      userId: review.userId || null,
      userEmail: review.userEmail || "",
      demoId: review.demoId || null,
      demoSlug: review.demoSlug || "",
      deploymentId: review.deploymentId || null,
      status: review.status,
      statusLabel: contentReviewStatusLabel(review.status),
      summary: review.summary || "",
      findings: Array.isArray(review.findings) ? review.findings.slice(0, 50) : [],
      resolutionStatus: contentReviewResolutionStatus(review),
      resolutionStatusLabel: contentReviewResolutionStatusLabel(contentReviewResolutionStatus(review)),
      adminNote: review.adminNote || "",
      handledBy: review.handledBy || "",
      handledAt: review.handledAt || null,
      createdAt: review.createdAt || "",
      updatedAt: review.updatedAt || ""
    };
  }

  function contentReviewResolutionStatus(review) {
    if (review?.resolutionStatus) return normalizeContentReviewResolutionStatus(review.resolutionStatus) || "pending_review";
    if (review?.status === "failed") return "pending_review";
    if (review?.status === "review") return "pending_review";
    return "auto_cleared";
  }

  function normalizeContentReviewResolutionStatus(value) {
    const v = String(value || "").trim().toLowerCase();
    const valid = ["pending_review", "auto_cleared", "approved", "rejected"];
    return valid.includes(v) ? v : "";
  }

  function contentReviewResolutionStatusLabel(status) {
    if (status === "pending_review") return "待复核";
    if (status === "auto_cleared") return "自动通过";
    if (status === "approved") return "已通过";
    if (status === "rejected") return "已拒绝";
    return "未知";
  }

  return {
    createAndPersistContentReview, persistPreflightContentReview,
    attachContentReviewToInspection,
    contentReviewResolutionStatus, normalizeContentReviewResolutionStatus,
    publicAdminContentReview, contentReviewResolutionStatusLabel
  };
}
