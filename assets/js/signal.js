document.documentElement.classList.remove("no-js");
const menu = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-links");
function closeMenu(returnFocus = false) {
  nav?.classList.remove("open");
  menu?.setAttribute("aria-expanded", "false");
  if (menu) menu.textContent = "Menu +";
  if (returnFocus) menu?.focus();
}
menu?.addEventListener("click", () => {
  const expanded = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(expanded));
  menu.textContent = expanded ? "Close −" : "Menu +";
  nav.classList.toggle("open", expanded);
});
nav
  ?.querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", () => closeMenu()));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu?.getAttribute("aria-expanded") === "true")
    closeMenu(true);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});
matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let motionPaused = reduceMotion.matches;
const motionButton = document.querySelector(".motion-toggle");
function setMotion(paused) {
  motionPaused = paused;
  document.body.classList.toggle("motion-paused", paused);
  if (motionButton) {
    motionButton.textContent = paused
      ? "Play signal motion ↗"
      : "Pause signal motion Ⅱ";
    motionButton.setAttribute("aria-pressed", String(paused));
  }
  document.dispatchEvent(
    new CustomEvent("signal-motion", { detail: { paused } }),
  );
}
setMotion(motionPaused);
motionButton?.addEventListener("click", () => setMotion(!motionPaused));
reduceMotion.addEventListener("change", (event) => setMotion(event.matches));

const steps = [...document.querySelectorAll(".pipeline-step")];
const progress = document.querySelector(".progress");
let scrollScheduled = false;
function updateScroll() {
  const range = document.documentElement.scrollHeight - innerHeight;
  if (progress)
    progress.style.width = `${range > 0 ? (scrollY / range) * 100 : 0}%`;
  const pipeline = document.querySelector(".pipeline");
  if (pipeline) {
    const bounds = pipeline.getBoundingClientRect();
    const count = Math.max(
      1,
      Math.min(
        steps.length,
        Math.ceil(
          (innerHeight * 0.85 - bounds.top) /
            Math.max(80, bounds.height / steps.length),
        ),
      ),
    );
    steps.forEach((step, index) =>
      step.classList.toggle("active", index < count),
    );
  }
  scrollScheduled = false;
}
addEventListener(
  "scroll",
  () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(updateScroll);
    }
  },
  { passive: true },
);
addEventListener("resize", updateScroll);
updateScroll();

const filters = [...document.querySelectorAll("[data-filter]")];
const projects = [...document.querySelectorAll("[data-category]")];
const filterBar = document.querySelector(".filters");
if (filterBar) filterBar.hidden = false;
filters.forEach((button) =>
  button.addEventListener("click", () => {
    const chosen = button.dataset.filter;
    filters.forEach((filter) =>
      filter.setAttribute("aria-pressed", String(filter === button)),
    );
    let visible = 0;
    projects.forEach((card) => {
      card.hidden =
        chosen !== "all" && !card.dataset.category.split(" ").includes(chosen);
      if (!card.hidden) visible++;
    });
    const status = document.querySelector(".filter-status");
    if (status)
      status.textContent = `${String(visible).padStart(2, "0")} projects · ${button.textContent.trim()}`;
  }),
);
const printButton = document.querySelector("[data-print]");
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener("click", () => window.print());
}
