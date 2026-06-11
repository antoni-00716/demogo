// DemoGo v0.9.30 - Demo visit tracking route
import { getClientIp } from "../lib/request-utils.js";
import { slugify } from "../lib/project-utils.js";

export function registerDemoTrackRoutes(app, { recordDemoVisit }) {
  app.get("/api/demo-track/:slug", async (req, res) => {
    try {
      const slug = slugify(req.params.slug);
      if (slug) {
        recordDemoVisit(slug, Number(req.query?.bytes || 0), getClientIp(req));
      }
      res.type("application/javascript").send("");
    } catch {
      res.type("application/javascript").send("");
    }
  });
}
