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
  aliases?: string[];
  version?: number;
  deploySource?: "web" | "cli" | "mcp" | "agent_api" | string;
  deploySourceLabel?: string;
  architecture?: ProjectArchitecture | null;
  hosting?: HostingPlan | null;
  hostingMode?: string;
  hostingModeLabel?: string;
  runtime?: RuntimePlan | null;
  failureDiagnosis?: FailureDiagnosis | null;
  runtimeEnv?: RuntimeEnvPublic;
  runtimeConfig?: RuntimeConfigStatus;
  database?: DemoDatabase | null;
  externalBackend?: ExternalBackendStatus | null;
  applicationReadiness?: ApplicationReadiness | null;
  projectProfile?: ProjectProfile | null;
  projectCategory?: string;
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
    uniqueVisitorsEstimate?: number;
    lastVisitedAt?: string;
  };
};

export type FailureDiagnosis = {
  category?: string;
  severity?: "warning" | "blocked" | string;
  title?: string;
  summary?: string;
  evidence?: string[];
  userActions?: string[];
  aiPrompt?: string;
  createdAt?: string;
};

export type DemoDatabase = {
  enabled?: boolean;
  engine?: string;
  databaseName?: string;
  userName?: string;
  status?: string;
  statusLabel?: string;
  host?: string;
  port?: number | null;
  initializedAt?: string | null;
  resetAt?: string | null;
  schema?: {
    status?: string;
    statusLabel?: string;
    source?: string;
    error?: string;
    executedAt?: string | null;
  };
  createdAt?: string | null;
  deletedAt?: string | null;
};

export type RuntimeEnvPublic = Record<string, {
  configured?: boolean;
  maskedValue?: string;
  updatedAt?: string | null;
}>;

export type RuntimeConfigStatus = {
  required?: string[];
  configured?: string[];
  missing?: string[];
  canStart?: boolean;
  status?: string;
  statusLabel?: string;
  nextAction?: string;
};

export type ExternalBackendStatus = {
  provider?: "supabase" | string;
  label?: string;
  status?: "missing" | "configured" | "ready" | "warning" | "failed" | string;
  statusLabel?: string;
  requiredEnv?: string[];
  acceptedEnv?: string[];
  configuredEnv?: string[];
  missingEnv?: string[];
  connection?: {
    checkedAt?: string;
    status?: string;
    statusLabel?: string;
    message?: string;
  } | null;
  warnings?: string[];
  features?: Record<string, boolean>;
  nextAction?: string;
};

export type ApplicationReadiness = {
  version?: string;
  kind?: string;
  label?: string;
  status?: "ready" | "warning" | "needs_action" | "blocked" | string;
  statusLabel?: string;
  score?: number;
  summary?: string;
  checklist?: ApplicationReadinessCheck[];
  missingActions?: string[];
  deliveryReport?: TrialDeliveryReport | null;
  aiPrompt?: string;
};

export type TrialDeliveryReport = {
  verdict?: "ready_to_share" | "share_with_attention" | "needs_configuration" | "blocked" | string;
  verdictLabel?: string;
  headline?: string;
  userMessage?: string;
  shareable?: boolean;
  feedbackReady?: boolean;
  score?: number;
  demoUrl?: string;
  primaryAction?: string;
  nextSteps?: string[];
  proofPoints?: string[];
  risks?: string[];
};

export type ApplicationReadinessCheck = {
  code?: string;
  label?: string;
  status?: "ready" | "not_required" | "missing" | "warning" | "blocked" | string;
  statusLabel?: string;
  detail?: string;
  action?: string;
};

export type ProjectProfile = {
  type?: string;
  label?: string;
  summary?: string;
  framework?: string;
  frontendFrameworks?: ProjectStackItem[];
  backendFrameworks?: ProjectStackItem[];
  databases?: ProjectStackItem[];
  environmentVariables?: ProjectEnvironmentVariables;
  assessment?: ProjectAssessment;
  buildTool?: string;
  platform?: string;
  supportStatus?: string;
  supportLabel?: string;
  supported?: boolean;
  notes?: string[];
  unsupportedReasons?: string[];
  signals?: string[];
};

export type ProjectStackItem = {
  code?: string;
  label?: string;
  evidence?: string;
};

export type ProjectEnvironmentVariables = {
  files?: string[];
  required?: string[];
  platformProvided?: string[];
  hasExample?: boolean;
  needsUserInput?: boolean;
};

export type ProjectAssessment = {
  projectKind?: string;
  projectKindLabel?: string;
  frameworks?: {
    frontend?: ProjectStackItem[];
    backend?: ProjectStackItem[];
    database?: ProjectStackItem[];
  };
  signals?: Record<string, boolean | string | number | undefined>;
  requirements?: {
    needsBuild?: boolean;
    needsRuntime?: boolean;
    needsDatabase?: boolean;
    needsEnvironmentVariables?: boolean;
  };
  support?: {
    canPublishNow?: boolean;
    publishMode?: string;
    supportedNow?: boolean;
    missingRequirements?: string[];
    nextAction?: string;
  };
  environmentVariables?: ProjectEnvironmentVariables;
  aiFixPrompt?: string;
};

export type RuntimePlan = {
  instanceId?: string;
  driver?: string;
  containerId?: string;
  containerName?: string;
  pid?: number | null;
  port?: number;
  engine?: string;
  framework?: string;
  frameworkLabel?: string;
  entry?: string;
  startCommand?: string;
  selectedStartCommand?: string;
  hasBuildScript?: boolean;
  hasStartProdScript?: boolean;
  buildBeforeStart?: boolean;
  requiresDatabase?: boolean;
  requiresWebSocket?: boolean;
  warnings?: string[];
  unsupportedReasons?: string[];
  expectedPortEnv?: string;
  status?: string;
  statusLabel?: string;
  logs?: string;
  logSummary?: string;
  failureDiagnosis?: FailureDiagnosis | null;
  config?: RuntimeConfigStatus;
  exposedPath?: string;
  apiPath?: string;
  limits?: {
    memory?: string;
    cpus?: string;
    ttlMinutes?: number;
    startTimeoutSeconds?: number;
    maxInstances?: number;
  };
  lifecycle?: {
    stage?: string;
    stageLabel?: string;
    startedAt?: string | null;
    expiresAt?: string | null;
    stoppedAt?: string | null;
  };
};

export type HostingPlan = {
  mode?: string;
  modeLabel?: string;
  architectureStage?: string;
  routeStrategy?: {
    publicPath?: string;
    staticPath?: string;
    apiPath?: string;
    description?: string;
  };
  runtime?: RuntimePlan;
  capabilities?: string[];
  limitations?: string[];
};

export type ProjectArchitecture = {
  version?: string;
  projectKind?: string;
  projectKindLabel?: string;
  hosting?: HostingPlan;
  layers?: Array<{
    code?: string;
    label?: string;
    status?: string;
  }>;
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

export type SubdomainRequest = {
  id: string;
  userId?: string;
  userEmail?: string;
  demoId?: string;
  demoSlug?: string;
  demoName?: string;
  subdomain: string;
  fullDomain?: string;
  status: "open" | "approved" | "rejected" | "canceled" | string;
  statusLabel?: string;
  message?: string;
  adminNote?: string;
  createdAt?: string;
  updatedAt?: string;
  handledAt?: string | null;
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
  trialFunnel?: {
    homeVisits?: number;
    registerStarts?: number;
    registerSuccesses?: number;
    uploadStarts?: number;
    inspectPassed?: number;
    inspectFailed?: number;
    deployStarts?: number;
    deploySuccesses?: number;
    deployFailures?: number;
    aiPublishViews?: number;
    aiDeploys?: number;
  };
  deploySourceBreakdown?: Record<string, number>;
  planCounts?: Record<string, number>;
  runtime?: {
    nodeProjects?: number;
    runningRuntimes?: number;
    stoppedRuntimes?: number;
    mysqlDatabases?: number;
    mysqlReady?: number;
  };
};
