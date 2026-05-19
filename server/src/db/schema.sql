CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  plan_code VARCHAR(32) NOT NULL DEFAULT 'free',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_login_at DATETIME NULL,
  metadata_json JSON NULL,
  INDEX idx_users_plan_code (plan_code),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent TEXT NULL,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
  code VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  max_online_demos INT NOT NULL,
  monthly_deploy_limit INT NOT NULL,
  demo_retention_days INT NOT NULL,
  max_zip_size_mb INT NOT NULL,
  max_forms INT NOT NULL DEFAULT 0,
  max_form_submissions INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS demos (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_email VARCHAR(255) NULL,
  slug VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  public_url VARCHAR(512) NULL,
  current_version INT NOT NULL DEFAULT 1,
  project_type VARCHAR(64) NULL,
  detected_type VARCHAR(64) NULL,
  entry_file VARCHAR(255) NULL,
  file_count INT NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  source_zip_path VARCHAR(512) NULL,
  output_path VARCHAR(512) NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  offline_at DATETIME NULL,
  deleted_at DATETIME NULL,
  visits INT NOT NULL DEFAULT 0,
  estimated_bytes BIGINT NOT NULL DEFAULT 0,
  unique_visitors_estimate INT NOT NULL DEFAULT 0,
  last_visited_at DATETIME NULL,
  metadata_json JSON NULL,
  INDEX idx_demos_user_id (user_id),
  INDEX idx_demos_status (status),
  INDEX idx_demos_created_at (created_at),
  INDEX idx_demos_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS demo_versions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  demo_id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  detected_type VARCHAR(64) NULL,
  file_count INT NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  build_status VARCHAR(32) NULL,
  build_log MEDIUMTEXT NULL,
  inspection_id VARCHAR(36) NULL,
  created_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_demo_versions_demo_id (demo_id),
  INDEX idx_demo_versions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deployment_events (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  demo_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NULL,
  deployment_id VARCHAR(36) NULL,
  event_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  message TEXT NULL,
  detail_json JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_deployment_events_demo_id (demo_id),
  INDEX idx_deployment_events_user_id (user_id),
  INDEX idx_deployment_events_deployment_id (deployment_id),
  INDEX idx_deployment_events_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_inspections (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  demo_id VARCHAR(36) NULL,
  deployment_job_id VARCHAR(36) NULL,
  can_publish TINYINT(1) NOT NULL DEFAULT 0,
  detected_type VARCHAR(64) NULL,
  entry_file VARCHAR(255) NULL,
  has_package_json TINYINT(1) NOT NULL DEFAULT 0,
  has_build_script TINYINT(1) NOT NULL DEFAULT 0,
  publishable_file_count INT NOT NULL DEFAULT 0,
  publishable_bytes BIGINT NOT NULL DEFAULT 0,
  ignored_files_json JSON NULL,
  blocked_files_json JSON NULL,
  api_calls_json JSON NULL,
  form_fields_json JSON NULL,
  issues_json JSON NULL,
  recommendations_json JSON NULL,
  rule_report_json JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_project_inspections_user_id (user_id),
  INDEX idx_project_inspections_demo_id (demo_id),
  INDEX idx_project_inspections_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_reviews (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  user_email VARCHAR(255) NULL,
  demo_id VARCHAR(36) NULL,
  demo_slug VARCHAR(128) NULL,
  deployment_id VARCHAR(36) NULL,
  action VARCHAR(32) NULL,
  actor_type VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL,
  provider VARCHAR(64) NOT NULL DEFAULT 'local_rules',
  engine VARCHAR(64) NOT NULL DEFAULT 'local_rules',
  summary TEXT NULL,
  reviewed_file_count INT NOT NULL DEFAULT 0,
  findings_json JSON NULL,
  reviewed_files_json JSON NULL,
  project_name VARCHAR(255) NULL,
  file_name VARCHAR(255) NULL,
  detected_type VARCHAR(64) NULL,
  resolution_status VARCHAR(32) NOT NULL DEFAULT 'resolved',
  admin_note TEXT NULL,
  handled_by VARCHAR(255) NULL,
  handled_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_content_reviews_user_id (user_id),
  INDEX idx_content_reviews_demo_id (demo_id),
  INDEX idx_content_reviews_status (status),
  INDEX idx_content_reviews_resolution_status (resolution_status),
  INDEX idx_content_reviews_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  action VARCHAR(64) NOT NULL,
  actor_type VARCHAR(32) NOT NULL,
  actor_id VARCHAR(36) NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(36) NULL,
  ip VARCHAR(64) NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_actor (actor_type, actor_id),
  INDEX idx_audit_logs_target (target_type, target_id),
  INDEX idx_audit_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_email VARCHAR(255) NULL,
  demo_id VARCHAR(36) NULL,
  demo_slug VARCHAR(128) NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'other',
  message TEXT NOT NULL,
  contact VARCHAR(120) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_feedback_user_id (user_id),
  INDEX idx_feedback_demo_id (demo_id),
  INDEX idx_feedback_status (status),
  INDEX idx_feedback_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forms (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_email VARCHAR(255) NULL,
  demo_id VARCHAR(36) NULL,
  demo_slug VARCHAR(128) NULL,
  demo_name VARCHAR(255) NULL,
  public_token VARCHAR(96) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  fields_json JSON NULL,
  submission_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_forms_user_id (user_id),
  INDEX idx_forms_demo_id (demo_id),
  INDEX idx_forms_demo_slug (demo_slug),
  INDEX idx_forms_status (status),
  INDEX idx_forms_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_submissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  form_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_email VARCHAR(255) NULL,
  demo_id VARCHAR(36) NULL,
  demo_slug VARCHAR(128) NULL,
  payload_json JSON NULL,
  ip VARCHAR(64) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_form_submissions_form_id (form_id),
  INDEX idx_form_submissions_user_id (user_id),
  INDEX idx_form_submissions_demo_id (demo_id),
  INDEX idx_form_submissions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_upgrade_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_email VARCHAR(255) NULL,
  current_plan VARCHAR(32) NOT NULL DEFAULT 'free',
  requested_plan VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  contact VARCHAR(120) NULL,
  message TEXT NULL,
  admin_note TEXT NULL,
  handled_by VARCHAR(64) NULL,
  handled_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  metadata_json JSON NULL,
  INDEX idx_plan_upgrade_requests_user_id (user_id),
  INDEX idx_plan_upgrade_requests_status (status),
  INDEX idx_plan_upgrade_requests_requested_plan (requested_plan),
  INDEX idx_plan_upgrade_requests_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO plans (
  code, name, max_online_demos, monthly_deploy_limit, demo_retention_days,
  max_zip_size_mb, max_forms, max_form_submissions, status, created_at, updated_at
) VALUES
  ('free', 'Free', 1, 3, 7, 50, 1, 100, 'active', NOW(), NOW()),
  ('lite', 'Lite', 3, 20, 30, 50, 3, 1000, 'active', NOW(), NOW()),
  ('pro', 'Pro', 10, 60, 30, 50, 10, 10000, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  max_online_demos = VALUES(max_online_demos),
  monthly_deploy_limit = VALUES(monthly_deploy_limit),
  demo_retention_days = VALUES(demo_retention_days),
  max_zip_size_mb = VALUES(max_zip_size_mb),
  max_forms = VALUES(max_forms),
  max_form_submissions = VALUES(max_form_submissions),
  status = VALUES(status),
  updated_at = NOW();
