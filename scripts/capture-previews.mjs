import { chromium } from "@playwright/test";
// Run against a local server after `npm run build && npm start`.
const browser = await chromium.launch();
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(process.env.PREVIEW_URL ?? "http://127.0.0.1:4321");
    await page.getByRole("button", { name: "Run guided walkthrough" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Turn complete" })
      .waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/${name}.png`, fullPage: true });
    if (name === "desktop") {
      for (const [tab, file] of [
        ["02 · API map", "api-map"],
        ["03 · How it works", "how-it-works"],
        ["04 · Check understanding", "quiz"],
      ]) {
        await page.getByRole("tab", { name: tab }).click();
        await page.screenshot({ path: `docs/${file}.png`, fullPage: true });
        if (file === "how-it-works") {
          await page.locator(".workflow-guide > .uml-scroll").screenshot({ path: "docs/uml-architecture.png" });
          await page.getByText("Explore the full UML activity workflow", { exact: true }).click();
          await page.locator(".uml-activity .uml-scroll").screenshot({ path: "docs/uml-workflow.png" });
        }
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
