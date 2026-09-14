const assert = require("node:assert/strict");
const { classifyListing } = require("./capacity-policy");

const court4 = { mode: "exclusive", maxCapacity: 4, remaining: null };
const studio8 = { mode: "exclusive", maxCapacity: 8, remaining: null };
const dropIn12With4Left = { mode: "open", maxCapacity: 12, remaining: 4 };

assert.equal(classifyListing(court4, 6, "capacity", false).state, "hide");
assert.equal(classifyListing(studio8, 6, "capacity", false).state, "show");
assert.equal(classifyListing(dropIn12With4Left, 6, "capacity", false).state, "unknown");
assert.equal(classifyListing(dropIn12With4Left, 6, "availability", false).state, "needs-date");
assert.equal(classifyListing(dropIn12With4Left, 6, "availability", true).state, "hide");
assert.equal(classifyListing(dropIn12With4Left, 4, "availability", true).state, "show");
console.log("capacity-policy: 6 deterministic cases passed");
