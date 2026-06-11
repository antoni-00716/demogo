const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Inject the same cookie from the log (already stripped of Secure/SameSite)
  await context.addCookies([{
    name: "demogo_session",
    value: "6cc47554241366dc37e5fb68d35a5e6b650f70e78990434ff0cc2842326aeb81",
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax"
  }]);

  const logs = [];
  page.on("console", (msg) => { if (msg.type() === "error") logs.push(msg.text()); });
  page.on("pageerror", (err) => logs.push(err.message));

  console.log("=== Navigating to app.html with injected cookie ===");
  
  let redirectedToLogin = false;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (url.includes("login.html")) redirectedToLogin = true;
      console.log("Navigation:", url);
    }
  });

  await page.goto("http://localhost:5173/app.html", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log("Final URL:", page.url());
  console.log("Redirected to login:", redirectedToLogin);

  // Check what's rendered
  const bodyText = await page.textContent("body").catch(() => "");
  if (bodyText.includes("我的作品")) console.log("WORKS! Dashboard loaded.");
  if (bodyText.includes("登录我的工作台")) console.log("FAILED: Redirected to login");
  if (bodyText.includes("继续管理你的作品")) console.log("FAILED: On login page");
  
  console.log("Body (first 300):", bodyText.substring(0, 300));
  console.log("Errors:", logs.length > 0 ? logs : "(none)");

  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
