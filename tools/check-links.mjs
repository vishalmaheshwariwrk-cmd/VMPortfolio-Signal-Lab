import fs from "node:fs/promises";
const report = JSON.parse(
  await fs.readFile("artifacts/qa-report.json", "utf8"),
);
const results = [];
for (let i = 0; i < report.externalLinks.length; i += 4) {
  await Promise.all(
    report.externalLinks.slice(i, i + 4).map(async (url) => {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          redirect: "follow",
          headers: { "User-Agent": "Portfolio-Link-Check/1.0" },
        });
        await response.body?.cancel();
        results.push({ url, status: response.status, finalUrl: response.url });
      } catch (error) {
        results.push({ url, status: "unverified", error: error.message });
      }
    }),
  );
}
await fs.writeFile(
  "artifacts/external-links.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
