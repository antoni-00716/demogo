import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson } from "../lib/data-access.js";
import { filterSubdomainRequests } from "../services/trial-analytics-service.js";

const subdomainRequestsFile = pathJoin(dataDir, "subdomain-requests.json");

export function registerSubdomainRoutes(app, { requireUser }) {
  app.get("/api/subdomain-requests", requireUser, async (req, res, next) => {
    try {
      const requests = await readJson(subdomainRequestsFile, []);
      res.json({
        requests: filterSubdomainRequests(requests, { status: req.query?.status })
          .filter((item) => item.userId === req.user.id)
          .slice(0, 200)
      });
    } catch (error) {
      next(error);
    }
  });
}