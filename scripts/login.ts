// One-time helper: opens a real browser so you can log in to Instacart and set your delivery
// address (this pins "nearby" stores). Saves the session to .instacart-state.json.
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("https://www.instacart.com/store/weis-markets/storefront");
  const save = () => ctx.storageState({ path: ".instacart-state.json" }).catch(() => {});
  setInterval(save, 3000);
  console.log("Log in, set your address, then CLOSE the browser window to save the session.");
  page.on("close", async () => {});
  await new Promise<void>((resolve) => {
    const iv = setInterval(async () => {
      if (page.isClosed()) return;
    }, 1000);
    page.on("close", () => { clearInterval(iv); resolve(); });
  });
})();

