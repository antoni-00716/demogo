export type User = {
  id: string;
  email: string;
  plan: "free" | "lite" | "pro";
  planName?: string;
  createdAt?: string;
};

export type AgentToken = {
  enabled: boolean;
  prefix?: string;
  createdAt?: string | null;
  value?: string;
};

export type Demo = {
  id: string;
  slug: string;
  name?: string;
  userEmail?: string;
  status: string;
  publicUrl?: string;
  linkMode?: "random" | "readable" | string;
  customDomainEligible?: boolean;
  version?: number;
  deploySource?: "web" | "cli" | "mcp" | "agent_api" | string;
  deploySourceLabel?: string;
  detectedType?: string;
  fileCount?: number;
  extractedBytes?: number;
  sourceFileName?: string;
  lastSourceFileName?: string;
  createdAt?: string;
  expiresAt?: string;
  updatedAt?: string;
  offlineAt?: string;
  deletedAt?: string;
  riskSummary?: Array<{
    type: string;
    label: string;
  }>;
  contentReview?: ContentReview | null;
  usage?: {
    visits?: number;
    estimatedBytes?: number;
  };
};

export type ContentReviewFinding = {
  id?: string;
  ruleId?: string;
  severity?: "block" | "review" | string;
  severityLabel?: string;
  category?: string;
  sourceFile?: string;
  snippet?: string;
  suggestion?: string;
};

export type ContentReview = {
  id?: string;
  status?: "passed" | "review_required" | "blocked" | "failed" | string;
  statusLabel?: string;
  decision?: string;
  nextStep?: string;
  provider?: string;
  engine?: string;
  summary?: string;
  findings?: ContentReviewFinding[];
  reviewedFileCount?: number;
  createdAt?: string;
  userEmail?: string;
  demoSlug?: string;
  projectName?: string;
  fileName?: string;
  action?: string;
  actorType?: string;
  resolutionStatus?: "pending" | "confirmed_violation" | "false_positive" | "resolved" | string;
  resolutionStatusLabel?: string;
  adminNote?: string;
  handledBy?: string;
  handledAt?: string | null;
};

export type DeploymentStep = {
  id: string;
  demoId?: string | null;
  userId?: string | null;
  deploymentId?: string | null;
  eventType: string;
  status: "pending" | "success" | "failed" | "skipped" | string;
  message?: string;
  detail?: Record<string, unknown>;
  createdAt?: string;
};

export type Quota = {
  plan?: {
    code: "free" | "lite" | "pro";
    name: string;
    maxOnlineDemos: number;
    monthlyDeployLimit: number;
    demoRetentionDays: number;
    maxForms?: number;
    maxFormSubmissions?: number;
  };
  onlineDemos?: {
    used: number;
    limit: number;
  };
  monthlyDeploys?: {
    used: number;
    limit: number;
  };
  retentionDays?: number;
};

export type FormField = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
};

export type HostedForm = {
  id: string;
  userId?: string;
  userEmail?: string;
  demoId?: string;
  demoSlug?: string;
  demoName?: string;
  name: string;
  status: "active" | "closed" | "deleted" | string;
  fields: FormField[];
  submissionCount?: number;
  submitUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FormSubmission = {
  id: string;
  formId: string;
  demoId?: string;
  demoSlug?: string;
  payload: Record<string, string>;
  createdAt?: string;
};

export type PlanRequest = {
  id: string;
  userEmail?: string;
  currentPlan?: string;
  currentPlanName?: string;
  requestedPlan: "lite" | "pro";
  requestedPlanName?: string;
  status: "open" | "approved" | "rejected" | "canceled";
  statusLabel?: string;
  contact?: string;
  message?: string;
  adminNote?: string;
  handledAt?: string | null;
  handledBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DeployEvent = {
  id: string;
  demoId: string;
  demoSlug: string;
  demoName?: string;
  demoStatus?: string;
  type: "create" | "update";
  typeLabel: string;
  at: string;
  version?: number;
  publicUrl?: string;
};

export type Feedback = {
  id: string;
  type: string;
  typeLabel?: string;
  userEmail?: string;
  demoId?: string;
  demoSlug?: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt?: string;
  updatedAt?: string;
};

export type AdminUser = User & {
  demoCount?: number;
  onlineDemoCount?: number;
};

export type AdminMetrics = {
  users?: number;
  demos?: number;
  liveDemos?: number;
  failedDemos?: number;
  totalVisits?: number;
  totalEstimatedBytes?: number;
  openFeedback?: number;
  forms?: number;
  activeForms?: number;
  formSubmissions?: number;
  openPlanUpgradeRequests?: number;
  contentReviews?: number;
  blockedContentReviews?: number;
  pendingContentReviews?: number;
  pendingContentReviewResolutions?: number;
  aiDeploys?: number;
  deploySuccesses?: number;
  deployFailures?: number;
  failureReasons?: Record<string, number>;
  planCounts?: Record<string, number>;
};
