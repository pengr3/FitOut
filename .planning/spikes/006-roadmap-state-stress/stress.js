(function () {
  "use strict";

  const base = {
    checked: { state: "done", title: "Get your account checked", copy: "Your account check is complete." },
    inherited: { state: "done", title: "Account ready", copy: "Your account can create and publish listings." },
    payoutsDone: { state: "done", title: "Set up payouts", copy: "Your payout account is ready." },
    listingDone: { state: "done", title: "List a space", copy: "Your listing has been submitted." },
    reviewNext: { state: "next", title: "FitOut checks your space", copy: "This begins after you submit a listing." },
  };

  function stepsFor(key, portfolioPolicy) {
    if (key === "rejectedCooldown") return [
      { state: "not-passed", title: "Get your account checked", copy: "The document image could not be read clearly.", retry: "You can try again after Sep 12, 2026 at 9:30 AM." },
      { state: "next", title: "Set up payouts", copy: "Available after your account is ready." },
      { state: "next", title: "List a space", copy: "Available after identity and payouts are ready." },
      base.reviewNext,
    ];
    if (key === "rejectedReady") return [
      { state: "not-passed", title: "Get your account checked", copy: "The document image could not be read clearly.", action: "Try another check" },
      { state: "next", title: "Set up payouts", copy: "Available after your account is ready." },
      { state: "next", title: "List a space", copy: "Available after identity and payouts are ready." },
      base.reviewNext,
    ];
    if (key === "stalePending") return [
      { state: "waiting", title: "Get your account checked", copy: "FitOut has been waiting longer than expected for the result.", action: "Check for an update", candidate: true },
      { state: "next", title: "Set up payouts", copy: "Available after your account is ready." },
      { state: "next", title: "List a space", copy: "Available after identity and payouts are ready." },
      base.reviewNext,
    ];
    if (key === "grandfathered") return [
      base.inherited,
      { state: "current", title: "Set up payouts", copy: "Connect where your earnings should go.", action: "Set up payouts" },
      { state: "next", title: "List a space", copy: "Add the details guests need to decide." },
      base.reviewNext,
    ];
    if (key === "listingRejected") return [
      base.checked,
      base.payoutsDone,
      base.listingDone,
      { state: "not-passed", title: "FitOut checks your space", copy: "The entrance photo does not show how guests enter the space.", action: "Fix and resubmit" },
    ];
    if (key === "mixed") {
      const allClear = portfolioPolicy === "all-clear";
      return [
        base.checked,
        base.payoutsDone,
        { state: "done", title: "List a space", copy: "2 listings submitted." },
        allClear
          ? { state: "not-passed", title: "FitOut checks your spaces", copy: "1 live · 1 needs fixes.", action: "Review your listings" }
          : { state: "done", title: "FitOut checks your spaces", copy: "1 live · 1 needs fixes.", note: "Journey complete; listing issue remains visible." },
      ];
    }
    return [
      base.checked,
      base.payoutsDone,
      { state: "done", title: "List a space", copy: "Your listing is published." },
      { state: "done", title: "FitOut checks your space", copy: "Your listing is approved and bookable." },
    ];
  }

  const labels = {
    done: "Done",
    current: "Current",
    waiting: "Waiting",
    "not-passed": "Not passed",
    next: "Next",
  };
  const marks = { done: "✓", current: "•", waiting: "·", "not-passed": "!", next: "" };
  const summaries = {
    rejectedCooldown: "Your account check did not pass. The next retry instant comes from the same server clock that guards the action.",
    rejectedReady: "The retry instant has passed. A deliberate new check is available.",
    stalePending: "This check has remained pending beyond the stated window, so waiting is no longer a dead end.",
    grandfathered: "This account can already list. The roadmap does not claim that a check happened.",
    listingRejected: "The host is ready, but this listing needs a deliberate fix-and-resubmit journey.",
    mixed: "One listing is live and another needs fixes. Test what 'journey complete' means for a portfolio.",
    ready: "Every gate agrees: this host has a bookable listing.",
  };

  const roadmap = document.querySelector("[data-roadmap]");
  const summary = document.querySelector("[data-summary]");
  const frame = document.querySelector("[data-frame]");
  const policyControl = document.querySelector("[data-policy-control]");
  const audit = document.querySelector("[data-audit]");
  const heightMetric = document.querySelector("[data-height]");
  const actionMetric = document.querySelector("[data-actions]");
  const eventLog = [];
  const logList = document.querySelector("[data-log]");
  let scenario = "rejectedCooldown";
  let portfolioPolicy = "first-live";

  function record(category, detail) {
    eventLog.push({ at: new Date().toISOString(), category: category, detail: detail });
    logList.innerHTML = eventLog.slice(-5).reverse().map(function (entry) {
      return "<li><b>" + entry.category + "</b> " + entry.detail + "</li>";
    }).join("");
  }

  function render() {
    const steps = stepsFor(scenario, portfolioPolicy);
    roadmap.innerHTML = steps.map(function (step, index) {
      return '<article class="card state-' + step.state + '">' +
        '<div class="card-top"><p>Step ' + (index + 1) + '</p><span class="state"><i aria-hidden="true">' + marks[step.state] + '</i>' + labels[step.state] + '</span></div>' +
        '<h3>' + step.title + '</h3><p class="copy">' + step.copy + '</p>' +
        (step.retry ? '<p class="retry">' + step.retry + '</p>' : "") +
        (step.note ? '<p class="note">' + step.note + '</p>' : "") +
        (step.action ? '<button type="button">' + step.action + (step.candidate ? '<small>Candidate rescue</small>' : "") + '</button>' : "") +
        '</article>';
    }).join("");
    summary.textContent = summaries[scenario];
    policyControl.hidden = scenario !== "mixed";
    document.querySelectorAll("[data-scenario]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.scenario === scenario));
    });
    document.querySelectorAll("[data-policy]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.policy === portfolioPolicy));
    });
    const violations = [];
    if (roadmap.querySelectorAll("article").length !== 4) violations.push("Roadmap does not have four gates");
    if (scenario === "grandfathered" && roadmap.textContent.toLowerCase().includes("checked")) violations.push("Grandfathered state claims a check");
    if (scenario === "rejectedCooldown" && roadmap.querySelector("button")) violations.push("Cooldown state exposes an early retry");
    if (roadmap.textContent.includes("%")) violations.push("Percentage progress appears");
    audit.className = violations.length ? "audit bad" : "audit good";
    audit.textContent = violations.length ? violations.join(" · ") : "Truth audit passed for this scenario";
    requestAnimationFrame(measure);
  }

  function measure() {
    heightMetric.textContent = Math.round(roadmap.getBoundingClientRect().height) + " px";
    actionMetric.textContent = String(roadmap.querySelectorAll("button").length);
  }

  document.querySelectorAll("[data-scenario]").forEach(function (button) {
    button.addEventListener("click", function () { scenario = button.dataset.scenario; record("scenario", button.textContent); render(); });
  });
  document.querySelectorAll("[data-policy]").forEach(function (button) {
    button.addEventListener("click", function () { portfolioPolicy = button.dataset.policy; record("portfolio", button.textContent); render(); });
  });
  document.querySelectorAll("[data-width]").forEach(function (button) {
    button.addEventListener("click", function () {
      frame.classList.toggle("phone", button.dataset.width === "phone");
      document.querySelectorAll("[data-width]").forEach(function (candidate) { candidate.setAttribute("aria-pressed", String(candidate === button)); });
      record("viewport", button.textContent);
      requestAnimationFrame(measure);
    });
  });
  document.querySelector("[data-export]").addEventListener("click", function () {
    const blob = new Blob([JSON.stringify({ scenario: scenario, portfolioPolicy: portfolioPolicy, events: eventLog }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "roadmap-state-stress-events.json"; link.click(); URL.revokeObjectURL(url);
  });
  window.addEventListener("resize", measure);
  record("loaded", "roadmap state stress");
  render();
})();
