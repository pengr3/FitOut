// T9 (07-20) — the blocked-dates list must show human copy, never the raw enum.
//
// The reported UAT nit: a host-cancellation block renders its stored sentinel `host_cancellation` verbatim
// in the blocked-dates row. blockReasonLabel maps that ONE sentinel to human copy while passing a host's own
// free-text reason through untouched (trimmed), and collapses null/blank to null so no empty " · " fragment
// is emitted. Pure module → the client blocks-editor can import it.

import { describe, it, expect } from "vitest";
import { blockReasonLabel } from "@/lib/availability/block-reason";

describe("blockReasonLabel (T9)", () => {
  it("maps the host_cancellation sentinel to human copy", () => {
    expect(blockReasonLabel("host_cancellation")).toBe("Cancelled by host");
  });

  it("passes a host's free-text reason through, trimmed", () => {
    expect(blockReasonLabel("Renovation")).toBe("Renovation");
    expect(blockReasonLabel("  Court resurfacing  ")).toBe("Court resurfacing");
  });

  it("returns null for null so no ' · ' fragment renders", () => {
    expect(blockReasonLabel(null)).toBeNull();
  });

  it("returns null for empty or whitespace-only reasons", () => {
    expect(blockReasonLabel("")).toBeNull();
    expect(blockReasonLabel("   ")).toBeNull();
  });
});
