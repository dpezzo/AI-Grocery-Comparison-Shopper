// One-time helper: opens your real Chrome so you can log in to Instacart and set your delivery
// address (this pins "nearby" stores). Saves the session to .instacart-state.json.
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

(async () => {
  const profile = mkdtempSync(join(tmpdir(), "instacart-login-"));
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: "chrome", // real installed Chrome; falls back with a clear error if missing
    headless: false,
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
    viewport: null,
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto("https://www.instacart.com/");
  console.log("Log in to Instacart and set your delivery address. When done, CLOSE the browser window.");
  const save = () => ctx.storageState({ path: ".instacart-state.json" }).catch(() => {});
  const iv = setInterval(save, 2000);
  await new Promise<void>((resolve) => ctx.on("close", () => resolve()));
  clearInterval(iv);
  console.log("Saved session to .instacart-state.json");
})();
