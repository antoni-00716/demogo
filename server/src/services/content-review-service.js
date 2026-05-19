import fs from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".json",
  ".md",
  ".txt"
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg"
]);

const RULES = [
  {
    id: "fraud_finance",
    severity: "block",
    category: "诈骗或高风险金融引导",
    patterns: [
      /刷单|返利|日赚|躺赚|稳赚|保本收益|高额回报|无风险套利|兼职返佣|先垫付|导师带单|内幕消息|包赚|稳赚不赔|快速回本/g,
      /贷款秒批|无抵押贷款|黑户贷款|征信修复|套现|代办信用卡|刷流水/g
    ],
    suggestion: "请删除刷单返利、保本收益、贷款套现、征信修复等高风险宣传内容。"
  },
  {
    id: "gambling",
    severity: "block",
    category: "博彩或赌博",
    patterns: [
      /博彩|赌博|百家乐|老虎机|体育投注|彩票代购|彩票代理|六合彩|网赌|棋牌投注|下注/g
    ],
    suggestion: "请删除博彩、赌博、下注、私彩等内容后再发布。"
  },
  {
    id: "porn",
    severity: "block",
    category: "低俗或色情内容",
    patterns: [
      /色情|裸聊|约炮|成人服务|成人视频|黄色网站|外围女|特殊服务|上门服务/g
    ],
    suggestion: "请删除色情、低俗或性暗示服务内容后再发布。"
  },
  {
    id: "illegal_goods",
    severity: "block",
    category: "违法违禁交易",
    patterns: [
      /毒品|冰毒|海洛因|摇头丸|大麻|枪支|弹药|买卖身份证|假证|代开发票|出售银行卡|出售对公账户|跑分平台/g
    ],
    suggestion: "请删除违法违禁交易、证件买卖、银行卡买卖、跑分等内容。"
  },
  {
    id: "malware",
    severity: "block",
    category: "恶意下载或攻击引导",
    patterns: [
      /木马|病毒下载|免杀|撞库|拖库|黑产|盗号|钓鱼网站|破解支付|绕过风控/g
    ],
    suggestion: "请删除恶意下载、攻击、盗号、绕过风控等内容。"
  },
  {
    id: "sensitive_collection",
    severity: "review",
    category: "敏感信息收集",
    patterns: [
      /身份证号|身份证照片|银行卡号|银行卡照片|验证码|短信验证码|支付密码|登录密码|人脸照片|手持身份证/g
    ],
    suggestion: "如果只是演示页面，请不要收集身份证、银行卡、验证码、密码或人脸照片等敏感信息。"
  },
  {
    id: "external_contact",
    severity: "review",
    category: "外部联系方式或导流",
    patterns: [
      /加微信|联系微信|扫码加群|QQ群|Telegram|WhatsApp|QQ群号|客服微信/g
    ],
    suggestion: "如页面需要联系方式，请说明真实主体和用途，避免出现诱导私聊或不明导流。"
  },
  {
    id: "payment_or_order",
    severity: "review",
    category: "支付或订单相关",
    patterns: [
      /立即付款|在线支付|支付定金|转账|收款码|订单支付|购买套餐|充值/g
    ],
    suggestion: "当前 DemoGo 不托管真实支付和订单后台。请确认页面只是演示，不要引导用户实际付款。"
  }
];

const SUSPICIOUS_URL_RULES = [
  {
    id: "suspicious_url",
    severity: "review",
    category: "可疑外部链接",
    suggestion: "请确认外部链接真实可信，避免跳转到不明下载、支付、私聊或高风险页面。"
  }
];

export async function reviewArchiveContent(analysis, options = {}) {
  const now = new Date().toISOString();
  const findings = [];
  const reviewedFiles = [];
  const maxTextBytes = Number(options.maxTextBytes || 1024 * 1024);
  let scannedTextBytes = 0;

  for (const item of (analysis?.publishableEntries || []).slice(0, 300)) {
    const relativePath = item.relativePath || "";
    const ext = extensionOf(relativePath);
    const bytes = Number(item.bytes || item.entry?.uncompressedSize || 0);

    if (IMAGE_EXTENSIONS.has(ext)) {
      findings.push(...reviewImagePath(relativePath));
      reviewedFiles.push(relativePath);
      continue;
    }

    if (!TEXT_EXTENSIONS.has(ext) || bytes > 512 * 1024 || scannedTextBytes > maxTextBytes) {
      continue;
    }

    const content = await options.readText(item);
    scannedTextBytes += Buffer.byteLength(content || "", "utf8");
    reviewedFiles.push(relativePath);
    findings.push(...reviewTextContent(content, relativePath));
  }

  const highestSeverity = resolveHighestSeverity(findings);
  return applyExternalReviewDecision({
    id: options.id || "",
    status: highestSeverity === "block" ? "blocked" : highestSeverity === "review" ? "review_required" : "passed",
    provider: "local_rules",
    engine: options.mode === "external" ? "local_rules_external_pending" : "local_rules",
    summary: summarizeFindings(highestSeverity, findings),
    findings: findings.slice(0, 80),
    reviewedFiles: reviewedFiles.slice(0, 120),
    reviewedFileCount: reviewedFiles.length,
    scannedTextBytes,
    createdAt: now
  }, options);
}

export async function reviewDirectoryContent(rootDir, options = {}) {
  const now = new Date().toISOString();
  const findings = [];
  const reviewedFiles = [];
  const maxTextBytes = Number(options.maxTextBytes || 1024 * 1024);
  let scannedTextBytes = 0;
  const files = [];
  await collectReviewFiles(rootDir, rootDir, files);

  for (const item of files.slice(0, 300)) {
    const ext = extensionOf(item.relativePath);
    if (IMAGE_EXTENSIONS.has(ext)) {
      findings.push(...reviewImagePath(item.relativePath));
      reviewedFiles.push(item.relativePath);
      continue;
    }

    if (!TEXT_EXTENSIONS.has(ext) || item.bytes > 512 * 1024 || scannedTextBytes > maxTextBytes) {
      continue;
    }

    let content = "";
    try {
      content = await fs.readFile(item.fullPath, "utf8");
    } catch {
      continue;
    }
    scannedTextBytes += Buffer.byteLength(content || "", "utf8");
    reviewedFiles.push(item.relativePath);
    findings.push(...reviewTextContent(content, item.relativePath));
  }

  const highestSeverity = resolveHighestSeverity(findings);
  return applyExternalReviewDecision({
    id: options.id || "",
    status: highestSeverity === "block" ? "blocked" : highestSeverity === "review" ? "review_required" : "passed",
    provider: "local_rules",
    engine: options.mode === "external" ? "local_rules_external_pending" : "local_rules",
    summary: summarizeFindings(highestSeverity, findings),
    findings: findings.slice(0, 80),
    reviewedFiles: reviewedFiles.slice(0, 120),
    reviewedFileCount: reviewedFiles.length,
    scannedTextBytes,
    createdAt: now
  }, options);
}

export function createContentReviewError(review) {
  const message = review.status === "review_required"
    ? "这个页面包含需要平台确认的内容，暂时不能公开分享。请先按提示修改，或联系平台处理。"
    : review.status === "failed"
      ? "发布前内容检查没有完成，为避免风险，暂时不能生成公开链接。请稍后重试或联系平台处理。"
      : "这个页面包含不适合公开分享的高风险内容，请根据提示修改后重新上传。";
  const error = new Error(message);
  error.statusCode = 400;
  error.contentReview = review;
  return error;
}

export function publicContentReview(review) {
  if (!review) return null;
  return {
    id: review.id,
    status: review.status,
    statusLabel: contentReviewStatusLabel(review.status),
    provider: review.provider,
    engine: review.engine,
    summary: review.summary,
    findings: Array.isArray(review.findings) ? review.findings.map(publicFinding) : [],
    reviewedFileCount: review.reviewedFileCount || 0,
    decision: reviewDecision(review),
    nextStep: reviewNextStep(review),
    createdAt: review.createdAt
  };
}

export function contentReviewStatusLabel(status) {
  if (status === "passed") return "已通过";
  if (status === "review_required") return "待人工确认";
  if (status === "blocked") return "已拦截";
  if (status === "failed") return "检查失败";
  return "未检查";
}

function reviewTextContent(content, sourceFile) {
  const text = normalizeText(content);
  const findings = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) {
        findings.push({
          id: `${rule.id}-${findings.length + 1}`,
          ruleId: rule.id,
          severity: rule.severity,
          category: rule.category,
          sourceFile,
          snippet: maskSnippet(text, match.index, match[0]),
          suggestion: rule.suggestion
        });
        if (findings.length >= 30) return findings;
      }
    }
  }

  for (const url of extractUrls(text)) {
    if (isSuspiciousUrl(url)) {
      const rule = SUSPICIOUS_URL_RULES[0];
      findings.push({
        id: `${rule.id}-${findings.length + 1}`,
        ruleId: rule.id,
        severity: rule.severity,
        category: rule.category,
        sourceFile,
        snippet: url.slice(0, 160),
        suggestion: rule.suggestion
      });
    }
  }

  return findings;
}

function applyExternalReviewDecision(review, options) {
  if (options.mode !== "external") return review;
  if (!options.externalEndpoint) {
    return {
      ...review,
      engine: "local_rules_external_not_configured",
      externalReview: {
        enabled: false,
        reason: "external_endpoint_missing"
      }
    };
  }
  return {
    ...review,
    engine: "local_rules_external_configured",
    externalReview: {
      enabled: true,
      endpoint: maskEndpoint(options.externalEndpoint),
      status: "not_called_in_current_version"
    }
  };
}

function reviewDecision(review) {
  if (!review) return "unknown";
  if (review.status === "passed") return "allow";
  if (review.status === "review_required") return "manual_review";
  return "deny";
}

function reviewNextStep(review) {
  if (!review) return "";
  if (review.status === "passed") return "可以继续生成试用链接。";
  if (review.status === "review_required") return "请先修改疑似风险内容，或联系平台确认后再发布。";
  if (review.status === "failed") return "请稍后重试；如果仍失败，请联系平台处理。";
  return "请删除或改写高风险内容后重新上传。";
}

function maskEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "configured";
  }
}

async function collectReviewFiles(rootDir, currentDir, result) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".cache"].includes(entry.name)) continue;
      await collectReviewFiles(rootDir, fullPath, result);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(fullPath);
    result.push({ fullPath, relativePath, bytes: stat.size });
  }
}

function reviewImagePath(relativePath) {
  const lower = String(relativePath || "").toLowerCase();
  if (!/(qr|qrcode|wechat|wx|pay|alipay|收款|付款|二维码)/i.test(lower)) return [];
  return [{
    id: `image_path_review-${relativePath}`,
    ruleId: "image_path_review",
    severity: "review",
    category: "图片可能包含二维码或支付引导",
    sourceFile: relativePath,
    snippet: relativePath,
    suggestion: "当前本地规则只能根据文件名识别可疑图片。上线试用前建议接入阿里云或腾讯云图片审核。"
  }];
}

function resolveHighestSeverity(findings) {
  if (findings.some((item) => item.severity === "block")) return "block";
  if (findings.some((item) => item.severity === "review")) return "review";
  return "pass";
}

function summarizeFindings(severity, findings) {
  if (severity === "pass") return "内容检查通过，可以继续生成试用链接。";
  const categories = Array.from(new Set(findings.map((item) => item.category))).slice(0, 3).join("、");
  if (severity === "block") return `内容检查未通过，发现 ${categories || "高风险内容"}。`;
  return `内容需要人工确认，发现 ${categories || "疑似风险内容"}。`;
}

function publicFinding(finding) {
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    severity: finding.severity,
    severityLabel: finding.severity === "block" ? "拦截" : "待确认",
    category: finding.category,
    sourceFile: finding.sourceFile,
    snippet: finding.snippet,
    suggestion: finding.suggestion
  };
}

function extractUrls(text) {
  const urls = new Set();
  const pattern = /\bhttps?:\/\/[^\s"'<>]+/gi;
  let match;
  while ((match = pattern.exec(text))) {
    urls.add(match[0].replace(/[),.;]+$/, ""));
  }
  return Array.from(urls).slice(0, 50);
}

function isSuspiciousUrl(url) {
  const lower = String(url || "").toLowerCase();
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(lower)) return false;
  return /\.(zip|rar|7z|exe|apk|dmg)(\?|#|$)/i.test(lower)
    || /\/(pay|payment|download|redirect|jump)\b/i.test(lower)
    || /(t\.me|telegram|bit\.ly|tinyurl|shorturl|wa\.me)/i.test(lower);
}

function normalizeText(content) {
  return String(content || "")
    .replace(/<script\b[^>]*>/gi, " ")
    .replace(/<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function maskSnippet(text, index, matchText) {
  const start = Math.max(0, Number(index || 0) - 24);
  const end = Math.min(text.length, Number(index || 0) + String(matchText || "").length + 24);
  return text.slice(start, end).trim().slice(0, 160);
}

function extensionOf(filePath) {
  const lower = String(filePath || "").toLowerCase();
  if (lower.endsWith(".tar.gz")) return ".tar.gz";
  const index = lower.lastIndexOf(".");
  return index >= 0 ? lower.slice(index) : "";
}
