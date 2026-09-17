import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "artifacts");
await fs.mkdir(output, { recursive: true });
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4173";
const launch = { headless: true };
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
else if (process.platform === "win32") launch.channel = "chrome";
const browser = await chromium.launch(launch);
const pages = (await fs.readdir(root)).filter((file) => file.endsWith(".html"));
const report = { pages: [], interactions: [], issues: [], externalLinks: [] };
const externals = new Set();
const localLinks = new Set();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (error) => errors.push(String(error)));
page.on("response", (response) => {
  if (response.url().startsWith(base) && response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
page.on("requestfailed", (request) => {
  if (!request.failure()?.errorText.includes("ABORTED"))
    errors.push(`${request.url()}: ${request.failure()?.errorText}`);
});

try {
  // Social metadata uses an ordinary local PNG, rendered from the original SVG.
  await page.goto(`${base}/assets/social-preview.svg`);
  await page.setViewportSize({ width: 1200, height: 630 });
  await page
    .locator("svg")
    .screenshot({ path: path.join(root, "assets/social-preview.png") });
  const axe = await fs.readFile(
    path.join(root, "node_modules/axe-core/axe.min.js"),
    "utf8",
  );
  for (const file of pages) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/${file}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: axe });
    const findings = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
        },
      });
      return result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target,
          summary: n.failureSummary,
        })),
      }));
    });
    if (findings.length)
      report.issues.push({ page: file, accessibility: findings });
    const data = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      brokenImages: [...document.images]
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src),
      links: [...document.querySelectorAll("a[href]")].map((a) => a.href),
      scripts: [...document.scripts].filter((s) => s.src).map((s) => s.src),
      forms: document.querySelectorAll("form").length,
      assets: performance.getEntriesByType("resource").map((r) => r.name),
      font: document.fonts.check("500 20px Signal"),
    }));
    assert.equal(data.h1, 1, `${file}: exactly one h1`);
    assert.equal(data.brokenImages.length, 0, `${file}: images load`);
    assert.equal(data.forms, 0, `${file}: no forms`);
    assert.equal(data.font, true, `${file}: local font loads`);
    const remoteRuntime = data.assets.filter(
      (url) => /^https?:/.test(url) && !url.startsWith(base),
    );
    assert.equal(
      remoteRuntime.length,
      0,
      `${file}: no external runtime requests`,
    );
    data.links.forEach((url) => {
      if (url.startsWith(base)) localLinks.add(url);
      else if (url.startsWith("https:")) externals.add(url);
    });
    const widths = [320, 390, 768, 1024, 1440, 1920];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `${file}: no overflow at ${width}px`);
    }
    report.pages.push({
      file,
      accessibilityViolations: findings.length,
      responsiveWidths: widths,
      localAssets: data.assets.length,
    });
  }

  for (const href of localLinks) {
    const url = new URL(href);
    const response = await page.request.get(url.href);
    assert.equal(response.status(), 200, `Local destination: ${url.href}`);
    if (url.hash) {
      await page.goto(url.origin + url.pathname);
      const exists = await page.evaluate(
        (hash) =>
          Boolean(document.getElementById(decodeURIComponent(hash.slice(1)))),
        url.hash,
      );
      assert.equal(exists, true, `Anchor exists: ${url.href}`);
    }
  }
  report.interactions.push(
    `Validated ${localLinks.size} unique local destinations and anchors`,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/index.html`);
  await page.locator(".menu-toggle").click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "true",
  );
  assert.equal(await page.locator("#main-nav").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.classList.contains("menu-toggle"),
    ),
    true,
  );
  await page.locator(".menu-toggle").click();
  await page.locator("#main-nav").getByRole("link", { name: "About" }).click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(new URL(page.url()).hash, "#about");
  report.interactions.push(
    "Mobile menu opens, closes, returns focus on Escape, and navigates to About",
  );

  await page.goto(`${base}/projects.html`);
  for (const [filter, count] of [
    ["analytics", 4],
    ["engineering", 3],
    ["research", 2],
    ["all", 8],
  ]) {
    await page.locator(`[data-filter="${filter}"]`).click();
    assert.equal(await page.locator("[data-category]:visible").count(), count);
    assert.equal(
      await page
        .locator(`[data-filter="${filter}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
  }
  report.interactions.push(
    "All four project filters return the expected projects and selected state",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/index.html`);
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.classList.contains("skip"),
    ),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "main");
  await page.locator(".motion-toggle").click();
  assert.equal(
    await page
      .locator(".signal-path")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  await page.locator(".motion-toggle").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".signal-path")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert.equal(await page.locator(".motion-toggle").isVisible(), false);
  report.interactions.push(
    "Skip link, motion pause, and system reduced-motion preference work",
  );

  await page.goto(`${base}/resume.html`);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".site-header").isVisible(), false);
  assert.equal(await page.locator(".resume-controls").isVisible(), false);
  assert.equal(await page.locator(".resume-sheet").isVisible(), true);
  await page.pdf({
    path: path.join(output, "resume-print-check.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
  report.interactions.push(
    "Résumé uses a clean print layout with navigation and controls hidden",
  );

  for (const [width, name] of [
    [1440, "desktop"],
    [768, "tablet"],
    [390, "mobile"],
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(output, `home-${name}.png`),
      fullPage: true,
    });
    await page.screenshot({ path: path.join(output, `hero-${name}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const file of [
    "projects.html",
    "research.html",
    "certificates.html",
    "case-study-airbnb.html",
    "resume.html",
  ]) {
    await page.goto(`${base}/${file}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: path.join(output, file.replace(".html", ".png")),
      fullPage: true,
    });
  }

  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const fallback = await noJS.newPage();
  await fallback.goto(`${base}/index.html`);
  assert.equal(await fallback.locator("#main-nav").isVisible(), true);
  assert.equal(await fallback.locator("h1").isVisible(), true);
  await fallback.goto(`${base}/projects.html`);
  assert.equal(await fallback.locator("[data-category]:visible").count(), 8);
  assert.equal(await fallback.locator(".filters").isVisible(), false);
  await noJS.close();
  report.interactions.push(
    "Without JavaScript, mobile navigation, page content, and all projects remain available",
  );
  assert.equal(
    errors.length,
    0,
    `No console, missing resource, or request errors: ${errors.join(", ")}`,
  );
  report.externalLinks = [...externals];
  await fs.writeFile(
    path.join(output, "qa-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.issues.length) process.exitCode = 1;
} finally {
  await browser.close();
}
