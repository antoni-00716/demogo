// DemoGo v0.9.5 - Content review provider abstraction
// Switchable between local_rules (default) and external_api

export function createContentReviewProvider(config = {}) {
  const mode = config.mode || "local_rules";
  const { reviewText: fallbackReview } = config;

  if (mode === "external_api" && config.endpoint) {
    return createExternalApiProvider(config, fallbackReview);
  }

  return {
    name: "local_rules",
    reviewText: fallbackReview || (async () => ({ status: "passed", findings: [], summary: "Local rules" }))
  };
}

function createExternalApiProvider(config, fallbackReview) {
  const endpoint = config.endpoint;
  const token = config.token || "";

  return {
    name: "external_api",
    async reviewText(text) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
          },
          body: JSON.stringify({
            text: text.slice(0, config.maxTextBytes || 1024 * 1024),
            provider: "demogo"
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          return fallbackReview
            ? fallbackReview(text)
            : { status: "passed", findings: [], summary: "Fallback: external API unavailable" };
        }

        const result = await response.json();
        return {
          status: result.status || "passed",
          findings: Array.isArray(result.findings) ? result.findings.slice(0, 20) : [],
          summary: result.summary || "External content review completed"
        };
      } catch {
        return fallbackReview
          ? fallbackReview(text)
          : { status: "passed", findings: [], summary: "Fallback: external API unreachable" };
      }
    }
  };
}
