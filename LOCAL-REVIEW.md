# Local review — 18 September 2026

**Preview:** http://127.0.0.1:4173

**Résumé draft:** http://127.0.0.1:4173/resume.html

**Repository:** [vishalmaheshwariwrk-cmd/VMPortfolio-Signal-Lab](https://github.com/vishalmaheshwariwrk-cmd/VMPortfolio-Signal-Lab)

**Upload status — 18 September 2026:** Redesign commit `c74823d` was pushed to the new repository's `main` branch. Local branch `codex/signal-lab-local` tracks `signal-lab/main`. Website deployment remains pending review; this upload did not configure GitHub Pages.

The legacy `VMPortfolio.github.io` repository was restored with revert commit `770a75a`, whose content matches baseline `5ad19cf`. Use `signal-lab` as the remote for future redesign uploads.

## Built

- Signal Lab homepage with the planned headline, four working primary actions, original signal-field SVG, selected work, process, capability matrix, career, research evidence, and contact links.
- Project archive with eight entries and four filters; three static case studies for Airbnb, Nashville housing, and startup-valuation research.
- Research and credentials pages, with source links and careful handling of credential dates.
- Printable résumé draft from the existing portfolio details. Its A4 print output is one page and was visually inspected.
- Shared responsive navigation, visible keyboard focus, skip link, scroll progress, animation pause, reduced-motion behavior, and a usable no-JavaScript fallback.
- Local font, favicon, and original PNG social preview. No external runtime requests, forms, or production package dependencies.
- Former demo URLs now lead visitors back into the portfolio. Unused template assets and licenses remain preserved.

## Current revision: WebGL particle world — 18 September 2026

Vishal rejected the first Canvas 2D cable illustration as visually unlike Remix, and approved floating content panels for a closer match. The renderer has been rebuilt as a genuine WebGL point cloud with a perspective camera, woven cable, luminous internal fibers, circuit-board ground, monitor, keyboard and PC tower. The camera travels along the cable, orbits the computer and ends on binary HELLO. Two blur passes provide bloom. The original 2D renderer has been removed.

Content now sits in compact floating panels with space for the scene to remain visible. Native scrolling, ordinary links, pause, reduced-motion styles and static fallback content are retained. WebGL creation failure and context loss reveal the static fallback; context restoration rebuilds GPU resources. The final camera shot fades foreground coils so they do not cover the greeting.

**Current validation:** In the built-in browser, axe reported no violations at 1280, 390 and 320px; there was no horizontal overflow or JavaScript error at those widths. Instrumented pause checks confirmed that frame callbacks stop and resume. Simulated WebGL failure, context loss and restoration all passed. Desktop hero/process/contact and mobile contact were visually inspected. JavaScript syntax and Git whitespace checks passed. The earlier Lighthouse score below belongs to the superseded 2D version; it has not been rerun for WebGL.

Vishal explicitly requested using the built-in browser and stopping Chrome-skill browsing. All browser work after that correction used the built-in browser. `tools/prepare-journey-review.mjs` creates a temporary, ignored audit page for that workflow. The CLI animation check was adapted to capture composited WebGL screenshots rather than cleared `toDataURL()` buffers; it was not rerun in an external browser during this revision.

This revision is local. The previous automatic approval rejection still blocks GitHub upload because of account usage limits. No alternate upload route was attempted. Use only `signal-lab` for the eventual upload; production deployment remains pending approval.

## Previous Canvas 2D journey — 18 September 2026

Vishal requested a Remix-inspired persistent background: a signal travelling through a wire, reaching a monitor with binary, and spelling HELLO at Contact. The homepage now has an original Canvas 2D scene with projected 3D cable geometry, travelling cyan/pink/lime packets, a scroll-driven camera, a monitor and binary characters that converge into HELLO. No Remix code or visual assets were copied.

The contact layout gives the terminal its own space beside the heading on desktop and below it on mobile. Native page scrolling and anchor links remain available. Pause freezes time-based animation while subsequent scrolling selects static compositions. Reduced-motion and no-JavaScript views keep a static signal diagram and contact terminal. The canvas is decorative, does not intercept clicks, and stops rendering in hidden tabs. Rendering is capped at approximately 30fps with bounded canvas resolution.

Validation for this change:

- `npm run check`: all 10 pages, 40 local destinations, six responsive widths, axe, navigation, filters, print and no-JavaScript checks passed.
- `npm run check:journey`: desktop/mobile scene stages, reverse scroll, direct Contact links, resizing, pixel-stable pause, resume and reduced motion passed. Normal-motion screenshots in `artifacts/journey/` were visually inspected.
- A separate read-only technical review found no blocking issue; its frame-rate finding was corrected.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices, 100 SEO. These are local lab scores, not field measurements.
- A roughly 4.5-second mobile-viewport scroll sample recorded no main-thread tasks over 50ms on this computer; slower physical devices still need real-device review.

Source uploads use the new `signal-lab` repository; production deployment remains pending approval.

## Validation

| Check              | Result                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright + axe   | 10 HTML pages passed, no automated accessibility violations                                                                                       |
| Responsive layout  | No horizontal overflow at 320, 390, 768, 1024, 1440, and 1920px                                                                                   |
| Local destinations | 40 unique links and anchors resolved                                                                                                              |
| Interaction checks | Mobile menu, Escape focus return, About navigation, four filters, skip link, motion pause, reduced motion, print layout, and no-JS content passed |
| Runtime            | No missing assets, broken images, page errors, external resource requests, or forms on redesigned pages                                           |
| External links     | 16 of 17 returned HTTP 200; LinkedIn profile returned automated-access status 999 and requires manual review                                      |
| Lighthouse mobile  | Performance 99, accessibility 100, best practices 100, SEO 100; local lab results, not field metrics                                              |
| Visual review      | Desktop, tablet, mobile, project archive, supporting pages, and one-page printed résumé reviewed                                                  |
| Git whitespace     | `git diff --check` passed                                                                                                                         |

Raw results and screenshots are in the ignored `artifacts/` directory. `npm run check` regenerates them. The standalone Lighthouse CLI produced a report but hit a Windows cleanup error; `node tools/lighthouse.mjs` completed cleanly and produced the scores above.

## Source and content decisions

Vishal confirmed existing public projects first and a printable résumé draft during this session. Case-study methods were checked against the linked Python and SQL source files; datasets were not executed, and quantitative findings or business-impact figures were not invented.

The homepage and résumé use owner-authored career and education details from the original repository. Research links were checked against the publisher page and published paper. Conceptual project diagrams are labelled; they are not presented as measured results.

Google Analytics certification is explicitly historical, expired July 2026 according to the existing record. Two Google Ads entries without evidence links and two applied-research entries with inconsistent dates are held from this version. Original content remains available in Git history.

## Remaining before release

1. Vishal reviews visual direction, case-study wording, and the résumé draft.
2. Claude completes the editorial review specified in Knotpad. A read-only Codex review was completed, but it is not Claude sign-off.
3. Manually verify the LinkedIn profile destination. HTTP 200 results establish reachability only, not certification authenticity or current project accuracy.
4. Decide whether to add a disclosed professional measurement/MMM case study, refreshed certification evidence, and corrected applied-research dates.
5. Confirm the production URL, add final canonical/absolute social metadata, and verify the GitHub Pages configuration and deployed asset paths after explicit release approval.

Knotpad task-claim attempts failed for existing tasks classified as HUMAN. Progress was therefore appended to **Portfolio Execution Plan — Claude + Codex** and **Portfolio Redesign Plan** without falsely changing task completion states. Production approval remains outstanding.
