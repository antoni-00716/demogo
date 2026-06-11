export function createDeployRateLimiter({ readJson, auditLogsFile, deployRateLimit, deployRateWindowMs }) {
  async function checkDeployRateLimit(user, ip) {
    const logs = await readJson(auditLogsFile, []);
    const cutoff = Date.now() - deployRateWindowMs;
    const recent = logs.filter((log) => {
      if (!["deploy_demo", "update_demo", "agent_deploy_demo", "agent_update_demo"].includes(log.action)) return false;
      if (new Date(log.createdAt).getTime() < cutoff) return false;
      return log.actorId === user.id || log.ip === ip;
    });
    return {
      allowed: recent.length < deployRateLimit,
      used: recent.length,
      limit: deployRateLimit
    };
  }

  return { checkDeployRateLimit };
}
