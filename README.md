# The Signal Lab — Vishal Maheshwari

A static portfolio built with semantic HTML, custom CSS, and vanilla JavaScript. Source code is uploaded to [VMPortfolio-Signal-Lab](https://github.com/vishalmaheshwariwrk-cmd/VMPortfolio-Signal-Lab) on `main`. Website deployment remains pending review.

This checkout uses the `signal-lab` remote for the redesign. Upload changes with `git push signal-lab HEAD:main`. The `origin` remote points to the restored legacy portfolio and is not the upload destination for this project.

## Local preview

From this directory:

```sh
npm install
npm run preview
```

Open **http://127.0.0.1:4173**. The server binds only to the local computer. You can also run `python -m http.server 4173 --bind 127.0.0.1` to preview without installing development dependencies.

## Files to edit

| File                       | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| `index.html`               | Homepage, selected work, process, capabilities, career, evidence, contact |
| `projects.html`            | Eight public projects with category filters                               |
| `case-study-airbnb.html`   | Airbnb exploratory analysis                                               |
| `case-study-housing.html`  | Nashville housing SQL cleaning                                            |
| `case-study-research.html` | Startup-valuation publication                                             |
| `research.html`            | Two publications with original source links                               |
| `certificates.html`        | Six credentials with dates and evidence links                             |
| `resume.html`              | Clearly labelled résumé draft with Print / Save as PDF layout             |
| `assets/css/signal.css`    | Shared styles, responsive breakpoints, print styles                       |
| `assets/js/signal.js`      | Menu, motion control, scroll progress, filters, print action              |
| `assets/fonts/`            | Self-hosted Space Grotesk with OFL license                                |

HTML files are the editable source; no build step is required. All active site assets use relative paths for GitHub Pages subpath compatibility. `generic.html` and `elements.html` preserve former template URLs with navigation to the redesigned site. Legacy template assets remain in the repository but no redesigned page loads them. Original HTML5 UP license files are retained.

There are no forms, backend services, authentication, database, API requests, runtime package dependencies, tracking, or secret configuration. Node packages are local QA tools only. SVG diagrams are labelled as conceptual illustrations rather than measured project results.

## Checks

Start the local preview, then:

```sh
npm run check
node tools/check-links.mjs
node tools/lighthouse.mjs
```

The browser check uses installed Google Chrome on Windows. On other systems, install a Playwright Chromium browser (`npx playwright install chromium`) or set `CHROME_PATH` to an installed executable. It checks all HTML pages, local assets and anchors, six screen widths, accessibility with axe, mobile navigation, keyboard focus, project filters, reduced motion, no-JavaScript access, and résumé print layout. Results and screenshots are written to the ignored `artifacts/` directory. The social-preview PNG is generated from the original SVG during this check.

External-link checks require internet access. A 403, timeout, or anti-bot response is **unverified**, not evidence that a link works or is broken.

The Lighthouse helper starts an isolated headless Chrome instance on local debugging port 9337 and closes it afterwards. It avoids a Windows temporary-profile cleanup issue in the Lighthouse CLI.

Latest review: see [LOCAL-REVIEW.md](LOCAL-REVIEW.md).

## Content review before release

- Review the résumé draft and replace it with an official résumé if desired.
- Claude’s editorial review described in Knotpad remains pending; Codex’s independent technical review does not replace it.
- Confirm current career dates and approved case-study wording with Vishal.
- Professional MMM work is represented as a capability only, with no client case study or invented results.
- Google Analytics certification is shown as historical, expired July 2026 according to the source portfolio.
- Google Ads credentials lacking evidence and applied-research entries with conflicting dates are held out of this version. Existing source history remains available in Git.
- Review external destinations that automated checks cannot verify.
- Finalise canonical and absolute social-preview URLs when the production URL is approved.
- Deploy only after Vishal explicitly approves release. No deployment workflow has been added.

Planning and handoff: Knotpad’s **Portfolio Redesign Plan** and **Portfolio Execution Plan — Claude + Codex**. Baseline commit: `5ad19cf`; working branch: `codex/signal-lab-local`.
