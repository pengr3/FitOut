(function () {
  function classifyListing(listing, partySize, policy, hasDate) {
    if (listing.maxCapacity < partySize) {
      return { state: "hide", reason: `Maximum capacity is ${listing.maxCapacity}.` };
    }
    if (policy === "availability" && listing.mode === "open" && !hasDate) {
      return { state: "needs-date", reason: "Choose a date to check remaining places." };
    }
    if (policy === "availability" && listing.mode === "open" && listing.remaining < partySize) {
      return { state: "hide", reason: `Only ${listing.remaining} places remain on the chosen day.` };
    }
    if (listing.mode === "open" && !hasDate) {
      return { state: "unknown", reason: `Holds up to ${listing.maxCapacity}; remaining places depend on the day.` };
    }
    return { state: "show", reason: listing.mode === "open" ? `${listing.remaining} places remain on the chosen day.` : `Fits up to ${listing.maxCapacity} people.` };
  }

  const api = { classifyListing };
  globalThis.CapacityPolicy = api;
  if (typeof module !== "undefined") module.exports = api;
})();
