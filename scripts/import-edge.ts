// Imports ONLY your Instacart login from Edge into .instacart-state.json.
// Close Edge completely first (it locks its cookie files). A temporary copy of the profile is
// used for the import and deleted afterwards; no other site's cookies are saved.
import { chromium } from "playwright";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const userData = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge", "User Data");
const profiles = readdirSync(userData).filter((n) => n === "Default" || /^Profile \d+$/.test(n));

(async () => {
  for (const name of profiles) {
    const tmp = mkdtempSync(join(tmpdir(), "edge-import-"));
    try {
      cpSync(join(userData, "Local State"), join(tmp, "Local State"));
      cpSync(join(userData, name), join(tmp, "Default"), {
        recursive: true,
        filter: (src) => !/(Cache|Code Cache|GPUCache|Service Worker|Extensions|IndexedDB|blob_storage)/i.test(src),
      });
      const ctx = await chromium.launchPersistentContext(tmp, {
        channel: "msedge",
        headless: true,
        ignoreDefaultArgs: ["--enable-automation"],
        args: ["--disable-blink-features=AutomationControlled"],
      });
      const page = ctx.pages()[0] ?? (await ctx.newPage());
      await page.goto("https://www.instacart.com/store/weis-markets/storefront", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(6000);
      const loggedIn = (await page.getByRole("button", { name: /^Log in$/ }).count()) === 0;
      const state = await ctx.storageState();
      await ctx.close();
      console.log(`[${name}] logged in to Instacart: ${loggedIn}`);
      if (loggedIn) {
        state.cookies = state.cookies.filter((c) => c.domain.includes("instacart"));
        state.origins = state.origins.filter((o) => o.origin.includes("instacart"));
        writeFileSync(".instacart-state.json", JSON.stringify(state));
        console.log(`Saved ${state.cookies.length} Instacart cookies to .instacart-state.json`);
        return;
      }
    } catch (e) {
      console.log(`[${name}] failed:`, String(e).split("\n")[0]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log("No logged-in Instacart session found in Edge. Use `npm run login` instead.");
  if (!existsSync(".instacart-state.json")) process.exitCode = 1;
})();
