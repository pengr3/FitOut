---
status: testing
phase: 24-search-bar-rework
source: [24-VERIFICATION.md]
started: 2026-09-15T09:38:36Z
updated: 2026-09-15T09:38:36Z
---

## Current Test

number: 1
name: Real mobile Back/Cancel actionability
expected: |
  At 375px in a production-style build without the Next development indicator, reach party (including group entry), then tap Back and Cancel normally. The actions stay in a reachable lower region, do not overlap, Back restores the location step and focus, and Cancel returns to /.
awaiting: user response

## Tests

### 1. Real mobile Back/Cancel actionability
expected: At 375px in a production-style build without the Next development indicator, reach party (including group entry), then tap Back and Cancel normally. The actions stay in a reachable lower region, do not overlap, Back restores the location step and focus, and Cancel returns to /.
result: pending

### 2. Visual balance and motion
expected: At 1280px and 375px, use the idle pill and a result-chip edit; complete solo/group flows, Back, and Cancel under normal and reduced motion. The 48rem desktop hierarchy feels balanced, the party step is not sparse, and motion/continuity feel calm with no page push or duplicate tree.
result: pending

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
