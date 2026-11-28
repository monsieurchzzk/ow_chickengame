import {
  formatApplicationCountdown,
  getScheduleProgress,
  renderMarkdown
} from "./utils.js";

const rulebookContent = document.getElementById("rulebook-content");
const viewLinks = document.querySelectorAll("[data-view-link]");
const pageViews = document.querySelectorAll("[data-view]");
let rulebookLoaded = false;

// TEST ONLY
// const TEST_NOW = new Date("2026-12-15T20:15:00+09:00");

function getReferenceTime() {
  return typeof TEST_NOW === "undefined" ? new Date() : TEST_NOW;
}

function updateScheduleCards(now) {
  const { current, pastIds } = getScheduleProgress(now);
  document.querySelectorAll("[data-schedule-stage]").forEach((card) => {
    const stageId = card.dataset.scheduleStage;
    const active = stageId === current?.id;
    const past = pastIds.includes(stageId);
    card.classList.toggle("schedule-highlight", active);
    card.classList.toggle("schedule-past", past);

    if (active) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");

    card.querySelector(".schedule-current-label, .schedule-past-label")?.remove();
    if (past) {
      addStatusLabel(card, "schedule-past-label", "완료");
    } else if (active) {
      const label = current.upcoming
        ? "다음 일정"
        : current.id === "application" ? "모집 진행" : "현재 일정";
      addStatusLabel(card, "schedule-current-label", label);
    }
  });
}

function addStatusLabel(card, className, text) {
  const label = document.createElement("span");
  label.className = className;
  label.textContent = text;
  card.append(label);
}

function updateApplicationCountdown(now) {
  const countdown = document.getElementById("application-countdown");
  const { text, isClosed } = formatApplicationCountdown(now);
  countdown.textContent = text;
  countdown.classList.toggle("is-closed", isClosed);
}

function updateSchedule() {
  const now = getReferenceTime();
  updateScheduleCards(now);
  updateApplicationCountdown(now);
}

function showView(view) {
  const currentView = view === "rules" ? "rules" : "home";
  pageViews.forEach((section) => {
    section.hidden = section.dataset.view !== currentView;
  });
  viewLinks.forEach((link) => {
    const active = link.dataset.viewLink === currentView;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (currentView === "rules" && !rulebookLoaded) loadRulebook();
  window.scrollTo(0, 0);
}

async function loadRulebook() {
  if (rulebookLoaded) return;

  try {
    const rulesUrl = new URL("./rules.md", import.meta.url);
    const response = await fetch(rulesUrl);
    if (!response.ok) throw new Error("규정집 파일을 불러오지 못했습니다.");

    const markdown = await response.text();
    rulebookContent.innerHTML = renderMarkdown(markdown);
    rulebookContent.classList.add("rulebook-loaded");
    rulebookLoaded = true;
  } catch {
    rulebookContent.innerHTML = '<p class="rulebook-error">규정집을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
  }
}

viewLinks.forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  const view = link.dataset.viewLink;
  history.pushState(null, "", view === "rules" ? "#rules" : "#home");
  showView(view);
}));
window.addEventListener("popstate", () => showView(location.hash === "#rules" ? "rules" : "home"));

updateSchedule();
window.setInterval(updateSchedule, 60 * 1000);
showView(location.hash === "#rules" ? "rules" : "home");
