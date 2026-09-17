import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import fs from "node:fs/promises";

const port = 9337;
const launch = { headless: true, args: [`--remote-debugging-port=${port}`] };
if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
else if (process.platform === "win32") launch.channel = "chrome";
const browser = await chromium.launch(launch);
try {
  const result = await lighthouse(
    process.env.PREVIEW_URL || "http://127.0.0.1:4173",
    {
      port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    },
  );
  if (!result || result.lhr.runtimeError)
    throw new Error(JSON.stringify(result?.lhr.runtimeError || "No report"));
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile("artifacts/lighthouse-mobile.json", result.report);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          Math.round(value.score * 100),
        ]),
      ),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
