(function () {
  "use strict";

  const scenarios = {
    unverified: {
      label: "Identity needed",
      summary: "Your next step is to complete the account check.",
      steps: [
        ["current", "Get your account checked", "FitOut checks who a host is before their first listing can go up.", "Start the check"],
        ["next", "Set up payouts", "Connect where your earnings should go."],
        ["next", "List a space", "Add the details guests need to decide."],
        ["next", "FitOut checks your space", "Your listing is checked before it can take bookings."],
      ],
    },
    pending: {
      label: "Identity pending",
      summary: "Your account check is in progress. Waiting is a normal step.",
      steps: [
        ["waiting", "Get your account checked", "FitOut is waiting on the result. If you have not finished, you can open the check again.", "Finish the check"],
        ["next", "Set up payouts", "Connect where your earnings should go."],
        ["next", "List a space", "Add the details guests need to decide."],
        ["next", "FitOut checks your space", "Your listing is checked before it can take bookings."],
      ],
    },
    payouts: {
      label: "Payouts next",
      summary: "Your account is checked. Set up payouts to keep moving.",
      steps: [
        ["done", "Get your account checked", "Your account check is complete."],
        ["current", "Set up payouts", "Connect where your earnings should go.", "Set up payouts"],
        ["next", "List a space", "Add the details guests need to decide."],
        ["next", "FitOut checks your space", "Your listing is checked before it can take bookings."],
      ],
    },
    listing: {
      label: "Listing next",
      summary: "Identity and payouts are ready. Now add your first space.",
      steps: [
        ["done", "Get your account checked", "Your account check is complete."],
        ["done", "Set up payouts", "Your payout account is ready."],
        ["current", "List a space", "Add the details guests need to decide.", "Create a listing"],
        ["next", "FitOut checks your space", "Your listing is checked before it can take bookings."],
      ],
    },
    review: {
      label: "Listing in review",
      summary: "Your setup is complete. FitOut is checking your space.",
      steps: [
        ["done", "Get your account checked", "Your account check is complete."],
        ["done", "Set up payouts", "Your payout account is ready."],
        ["done", "List a space", "Your listing has been submitted."],
        ["waiting", "FitOut checks your space", "Your listing is waiting for a decision."],
      ],
    },
    ready: {
      label: "Bookable",
      summary: "You are ready. Your space can take bookings.",
      steps: [
        ["done", "Get your account checked", "Your account check is complete."],
        ["done", "Set up payouts", "Your payout account is ready."],
        ["done", "List a space", "Your listing is published."],
        ["done", "FitOut checks your space", "Your listing is approved and bookable."],
      ],
    },
  };

  const stateLabel = { done: "Done", current: "Current", waiting: "Waiting", next: "Next" };
  const stateMark = { done: "✓", current: "•", waiting: "·", next: "" };
  const roadmap = document.querySelector("[data-roadmap]");
  const summary = document.querySelector("[data-summary]");
  const scenarioLabel = document.querySelector("[data-scenario-label]");
  const frame = document.querySelector("[data-frame]");
  const heightMetric = document.querySelector("[data-height]");
  const actionMetric = document.querySelector("[data-actions]");
  const containerMetric = document.querySelector("[data-containers]");
  const logList = document.querySelector("[data-log]");
  const eventLog = [];

  function record(category, detail) {
    eventLog.push({ at: new Date().toISOString(), category: category, detail: detail });
    logList.innerHTML = eventLog
      .slice(-5)
      .reverse()
      .map(function (entry) {
        return '<li><span>' + entry.category + '</span>' + entry.detail + "</li>";
      })
      .join("");
  }

  function render(key) {
    const scenario = scenarios[key];
    roadmap.innerHTML = "";
    scenarioLabel.textContent = scenario.label;
    summary.textContent = scenario.summary;

    scenario.steps.forEach(function (step, index) {
      const state = step[0];
      const item = document.createElement("article");
      item.className = "roadmap-step state-" + state;
      item.dataset.state = state;
      item.innerHTML =
        '<div class="step-rail" aria-hidden="true"><span class="step-mark">' +
        stateMark[state] +
        '</span><span class="step-line"></span></div>' +
        '<div class="step-body"><div class="step-top"><p class="step-number">Step ' +
        (index + 1) +
        '</p><span class="state-label">' +
        stateLabel[state] +
        '</span></div><h3>' +
        step[1] +
        '</h3><p class="step-copy">' +
        step[2] +
        '</p>' +
        (step[3] ? '<button type="button">' + step[3] + "</button>" : "") +
        "</div>";
      roadmap.appendChild(item);
    });

    document.querySelectorAll("[data-scenario]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.scenario === key));
    });
    requestAnimationFrame(measure);
  }

  function measure() {
    heightMetric.textContent = Math.round(roadmap.getBoundingClientRect().height) + " px";
    actionMetric.textContent = String(roadmap.querySelectorAll("button").length);
    containerMetric.textContent = document.body.dataset.layout === "cards" ? "4" : "1";
  }

  document.querySelectorAll("[data-scenario]").forEach(function (button) {
    button.addEventListener("click", function () {
      record("scenario", scenarios[button.dataset.scenario].label);
      render(button.dataset.scenario);
    });
  });

  document.querySelectorAll("[data-width]").forEach(function (button) {
    button.addEventListener("click", function () {
      const phone = button.dataset.width === "phone";
      frame.classList.toggle("phone", phone);
      record("viewport", phone ? "320px phone frame" : "desktop frame");
      document.querySelectorAll("[data-width]").forEach(function (candidate) {
        candidate.setAttribute("aria-pressed", String(candidate === button));
      });
      requestAnimationFrame(measure);
    });
  });

  document.querySelector("[data-export]").addEventListener("click", function () {
    record("export", eventLog.length + " events");
    const blob = new Blob([JSON.stringify({ layout: document.body.dataset.layout, events: eventLog }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "roadmap-spike-events.json";
    anchor.click();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("resize", measure);
  record("loaded", document.body.dataset.layout + " comparison");
  render("payouts");
})();
