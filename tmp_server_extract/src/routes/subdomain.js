import { join as pathJoin } from "node:path";
import { dataDir } from "../config.js";
import { readJson } from "../lib/data-access.js";
import { filterSubdomainRequests } from "../services/trial-analytics-service.js";

const subdomainRequestsFile = pathJoin(dataDir, "subdomain-requests.json");

export function registerSubdomainRoutes(app, { requireUser }) {
  app.get("/api/subdomain/check", requireUser, async (req, res, next) => {
    try {
      const requests = await readJson(subdomainRequestsFile, []);
      const userRequests = requests.filter((item) => item.userId === req.user.id);
      res.json({
        ok: true,
        requested: userRequests.length > 0,
        count: userRequests.length
      });
    } catch (error) {
      next(error);
    }
  });

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