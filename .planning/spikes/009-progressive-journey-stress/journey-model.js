(function () {
  const FIELDS = ["activity", "location", "party"];
  const empty = () => ({ screen: "idle", step: 0, answers: { activity: null, location: null, party: null } });
  function start() { return { ...empty(), screen: "flow", step: 0 }; }
  function choose(state, value) {
    const field = FIELDS[state.step];
    const answers = { ...state.answers, [field]: value };
    return state.step === FIELDS.length - 1
      ? { ...state, answers, step: 3, screen: "ready" }
      : { ...state, answers, step: state.step + 1 };
  }
  function back(state) {
    if (state.screen === "ready") return { ...state, screen: "flow", step: 2 };
    return { ...state, step: Math.max(0, state.step - 1) };
  }
  function edit(state, field) { return { ...state, screen: "flow", step: FIELDS.indexOf(field) }; }
  function cancel() { return empty(); }
  function submit(state) {
    if (state.screen !== "ready" || FIELDS.some((field) => !state.answers[field])) throw new Error("All answers required.");
    return { ...state, screen: "results" };
  }
  const api = { FIELDS, empty, start, choose, back, edit, cancel, submit };
  globalThis.JourneyModel = api;
  if (typeof module !== "undefined") module.exports = api;
})();
