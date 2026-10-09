---
phase: "27"
slug: app-subdomain-marketing-website
status: planned
shadcn_initialized: true
preset: existing-Court
created: 2026-10-09
---

# Phase 27 UI repair contract

Supplementary contract for the recorded repairs; CONTEXT D-01–D-19 and existing
marketing pages remain authoritative. Root inline review, not independent-agent
approval. No new visual design, package, registry block or branded imagery.

## Design System

Existing local shadcn/Radix wrappers, Tailwind/CVA recipes and Court tokens are
the authority. Geist sans/mono come from installed source. Use semantic typography
and spacing recipes from globals.css rather than introducing pixel measurements.
Court background/foreground/card/brand variables retain their existing values;
no palette/theme/font changes. Marketing stays Court-only. Existing app theme
behavior is preserved. Brand accents denote action/selection/focus.

## Component Inventory

Enumerated with rg --files src/components/ui on October9:32 local wrapper files,
including Dialog, Popover, Button, Input, Skeleton and RadioGroup. This is a local
component inventory, not a remote package registry. Existing Skeleton is the
generic primitive; loading repairs must prefer the existing semantic box recipes
referenced by loading-coverage.test.ts. No remote component fetch is planned.

## Interaction contract

| Surface | Required behavior | Verification |
|---|---|---|
| Search | One mounted control/panel tree at every viewport; shared existing responsive authority; CSS/presentation changes preserve state, URL history, focus/Escape and long labels. No second matchMedia or duplicate portals. | one-tree, selector census and real 320/375/768/1440px browser checks |
| App handoff | D-12/D-18 anonymous search opens in the same tab, with the actual Search spaces group and meaningful controls; no manufactured hidden test-only group. | marketing tracer and journeys |
| Slot checkout boundary | Existing brand border/ring with bg-muted and disabled:opacity-100; aria-pressed=true; accessible checkout/end label. Disabled boundary is not a purchasable unavailable start slot. | end-boundary positive/negative cases |
| Loading | Existing semantic skeleton dimensions, single nav tree, no duplicate announcements, no raw fixed widths or selector escape. | loading coverage and applied suspense mutation |
| Marketing | Preserve six routes, Home/For Hosts/For Players/About/FAQ/Contact order, existing approved imagery/copy and same-tab CTAs. | existing 52 owned Chromium cases |

## Copywriting Contract

Keep existing labels Find a space, Start hosting, Search spaces and the current
checkout-selected/end-time label. Pricing validation says Set an hourly rate to
publish; day pricing is clearly optional. Preserve existing recovery/uncertain
Contact messages; simulated success is not live delivery evidence. No money,
verification, legal or sending guarantees are added.

## UI Considerations

| State | Surface | Required resolution |
|---|---|---|
| Empty/error/loading | Search and host entry | Preserve real app empty/error/recovery states and semantic skeletons; no page containing an empty group solely for tests |
| Overflow/long text | Search, slots, marketing | No horizontal overflow at required widths; labels wrap without duplicating controls |
| Open/closed/focus | Search panel | Same mounted tree/state across resize; correct focus return, Escape and inert closed presentation |
| Selected/unavailable | Slot boundary | Distinguish selected checkout endpoint from unavailable bookable start; preserve accessible state and date/timezone semantics |
| Cold/warm navigation | Host new listing | Observe both; actual redirect and draft ownership must hold; diagnose streaming errors before changing timeouts |

## Registry Safety

No external registries or generated blocks. Existing UI/Next guides and local
recipes are the only design dependencies. Windows visual baselines remain forbidden.
