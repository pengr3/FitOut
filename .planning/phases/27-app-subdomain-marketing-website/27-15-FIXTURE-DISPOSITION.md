# Preserved feature/fixture ownership

D-27-G01 pricing is committed separately (8355697f/c5353509). The corrected
end-boundary fixture is still UNTRACKED at tests/availability/slot-picker-end-boundary.test.tsx; SHA256 e94bd3101c3c48305562754acee343aa4f3c72f2780ca77394f5ecffa9bce427.
All5 cases pass against the honestly dirty shared source. Preserve its current
checkout label/aria-pressed, exact one-hour endpoint, muted fill/brand ring/readable
disabled state, unavailable-start negative and final checkout boundary.

HEAD SlotPicker lacks the checkout-boundary labels and allowFullDay API; those
belong to preserved user edits in slot-picker.tsx and slot-selection.ts. Promoting
this fixture alone would introduce a failing/uncompilable release test; adopting
the product algorithm would exceed this fixture-only task. No SlotPicker, selection
algorithm, bookability or money change is staged. The corrected fixture is available
for the feature owner's later reviewed commit and full feature proof. G03 fixture
assertions are reconciled; feature release is not claimed.

G07 is distinct: the strict host closure still expects21 and derives22 in the dirty
tree because the dirty wizard imports untracked host-location-map.tsx. The wrapper
and dynamic inner map author no role=status or aria-live; the wrapper's loading
Skeleton is the existing primitive. Dynamic import reach and interactive map/a11y
behavior need the separate feature owner; they are not proven by source inspection.
Do not widen21 to22 or adopt imports/maps in this phase. Shared census29pass/1fail
remains; committed-source census30pass is part of clean design96. No detector or
announcement inventory changes. This dirty-source observation stays open after
committed-source checks.

These are explicit ownership dispositions, not missing-test waivers or six full
acceptance gates. Contact and all release HOLDs remain.
