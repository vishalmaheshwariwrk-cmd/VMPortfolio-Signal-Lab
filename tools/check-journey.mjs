import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("artifacts/journey", { recursive: true });
const launch = { headless: true };
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
else if (process.platform === "win32") launch.channel = "chrome";
const browser = await chromium.launch(launch);
const errors = [];
const results = [];
for (const width of [390, 1440]) {
  const page = await browser.newPage({
    viewport: { width, height: width === 390 ? 844 : 1000 },
    reducedMotion: "no-preference",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector(".journey-ready");
  await page.waitForTimeout(300);
  for (const stage of ["hero", "process", "about", "contact"]) {
    await page.evaluate((stage) => {
      const el =
        stage === "hero"
          ? document.querySelector(".hero")
          : document.getElementById(stage);
      const dest = document.querySelector(".journey-destination");
      const top =
        stage === "contact"
          ? dest.getBoundingClientRect().top +
            scrollY +
            dest.offsetHeight / 2 -
            innerHeight * 0.53
          : stage === "hero"
            ? 0
            : el.getBoundingClientRect().top + scrollY - 140;
      window.scrollTo({ top, behavior: "instant" });
    }, stage);
    await page.waitForTimeout(950);
    await page.screenshot({ path: `artifacts/journey/${width}-${stage}.png` });
    const state = await page
      .locator("#signal-canvas")
      .evaluate((el) => ({ ...el.dataset }));
    results.push({ width, stage, ...state });
    if (stage === "contact") assert.equal(state.stage, "hello");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.locator(".motion-toggle").click();
  await page.waitForTimeout(150);
  const first = await page
    .locator("#signal-canvas")
    .evaluate((el) => el.toDataURL());
  await page.waitForTimeout(250);
  const second = await page
    .locator("#signal-canvas")
    .evaluate((el) => el.toDataURL());
  assert.equal(first, second, "Pause freezes rendered pixels");
  await page.locator(".motion-toggle").click();
  await page.waitForTimeout(200);
  assert.notEqual(
    second,
    await page.locator("#signal-canvas").evaluate((el) => el.toDataURL()),
    "Play resumes rendering",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(1000);
  assert.equal(
    await page.locator("#signal-canvas").getAttribute("data-stage"),
    "transmit",
  );
  await page.goto("http://127.0.0.1:4173/index.html#contact");
  // Native smooth anchor navigation can take longer than a second on tall pages.
  await expect(page.locator("#signal-canvas")).toHaveAttribute(
    "data-stage",
    "hello",
  );
  await page.setViewportSize({
    width: width === 390 ? 1440 : 390,
    height: 900,
  });
  await page.locator(".journey-destination").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  assert.equal(
    await page.locator("#signal-canvas").getAttribute("data-stage"),
    "hello",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".signal-journey").isVisible(), false);
  assert.equal(await page.locator(".terminal-fallback").isVisible(), true);
  await page.screenshot({
    path: `artifacts/journey/${width}-reduced-contact.png`,
  });
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
await writeFile(
  "artifacts/journey/results.json",
  JSON.stringify(results, null, 2),
);
console.log(
  "Journey: desktop/mobile stages, reverse scroll, direct Contact, resize, pause/play pixels, reduced motion passed.",
);
