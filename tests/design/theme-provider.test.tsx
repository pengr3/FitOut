// @vitest-environment jsdom

// THEME-01 — the theme runtime's two contracts, as executable assertions.
//
// WHY THIS FILE EXISTS. `next-themes` has been a dependency for the entire life of this project and
// NO provider had ever mounted. The visible consequence was in the toast: `useTheme()` returned
// `"system"`, a widening cast passed it straight through to Sonner (whose `theme` prop accepts only
// `light | dark | system`), and a booker on a dark-mode laptop got DARK toasts inside a light-only
// app. Both halves of that failure — an unmounted provider and a cast standing in for a map — are
// exactly the kind that a type-checker cannot see and a human reviewer reads past.
//
// THE TWO HALVES ASSERTED HERE:
//
//   1. THE PROVIDER CONTRACT. Every prop this app hands next-themes, checked by capturing the props
//      object the library's own provider receives. These are not stylistic settings: `attribute`
//      must be `data-theme` and never `class` (which would collide with the dormant `.dark` block),
//      `enableSystem` must be false (D-06 — the app always renders court), and the forced-theme prop
//      must be ABSENT (it short-circuits the pre-paint script before localStorage is read and would
//      silently defeat both of D-08's override paths).
//
//   2. THE SONNER MAPPING. `resolvedTheme` now returns a THEME NAME — `"court"` or `"grove"` —
//      and neither is a value Sonner's prop accepts. Both must map to `"light"` (D-03: both named
//      themes are light-background). The `"dark"` case is asserted too, so this is provably a MAP
//      and not a constant `"light"` dressed up as one — a constant would pass every other assertion
//      in this file.
//
// WHY jsdom AND NOT THE COMPILED STYLESHEET. Nothing here is a cascade question. These are React
// prop values, which is precisely what jsdom + Testing Library are good for. 10-02's THEME-04 spike
// established the inverse rule and it still holds: jsdom never substitutes `var()` and ignores
// `@layer` outright, so no assertion about COMPILED CSS may ever run through it. This file asserts
// no CSS at all.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • That next-themes actually honours these props. The library is mocked here; what is asserted is
//     the contract this app states, not the library's implementation of it. The pre-paint behaviour
//     is only observable in a real browser (Phase 11).
//   • That the attribute really lands on <html> before paint. Same reason.
//   • That the toast RENDERS light. This asserts the prop reaching Sonner, not pixels.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// A single mutable capture object shared by both mocks. `vi.hoisted` because `vi.mock` factories are
// hoisted above the imports and would otherwise close over an uninitialised binding.
const captured = vi.hoisted(() => ({
  provider: null as Record<string, unknown> | null,
  sonner: null as Record<string, unknown> | null,
  /** Drives what the mocked `useTheme()` reports; set per-case below. */
  resolvedTheme: undefined as string | undefined,
}));

vi.mock("next-themes", () => ({
  // Records the props THIS app passes, then renders children so the tree under test still mounts.
  ThemeProvider: (props: { children?: React.ReactNode }) => {
    captured.provider = props as Record<string, unknown>;
    return props.children;
  },
  useTheme: () => ({
    resolvedTheme: captured.resolvedTheme,
    setTheme: vi.fn(),
    themes: [],
  }),
}));

vi.mock("sonner", () => ({
  // Records the props reaching the real toast component. Renders nothing: this file asserts the
  // value of one prop, and mounting Sonner's portal would add moving parts that prove nothing.
  Toaster: (props: Record<string, unknown>) => {
    captured.sonner = props;
    return null;
  },
}));

import {
  ThemeProvider,
  THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
} from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";

afterEach(() => {
  cleanup();
  captured.provider = null;
  captured.sonner = null;
  captured.resolvedTheme = undefined;
});

/** Render the Toaster with `useTheme()` reporting `resolved`, and return the theme prop Sonner got. */
function sonnerThemeFor(resolved: string | undefined): unknown {
  captured.resolvedTheme = resolved;
  render(<Toaster />);
  return captured.sonner?.theme;
}

describe("THEME-01 — the provider contract handed to next-themes", () => {
  function renderProvider() {
    render(
      <ThemeProvider>
        <p>probe child</p>
      </ThemeProvider>,
    );
    expect(captured.provider, "next-themes' provider was never rendered").not.toBeNull();
    return captured.provider!;
  }

  it("switches on data-theme, never on class", () => {
    // `class` would collide with the `.dark` block still sitting in globals.css.
    expect(renderProvider().attribute).toBe("data-theme");
  });

  it("declares exactly the two named themes", () => {
    // The library's own default is ["light","dark"]; leaving it would make both names unreachable.
    expect(renderProvider().themes).toEqual(["court", "grove"]);
    expect(THEMES).toEqual(["court", "grove"]);
  });

  it("fixes the default at court and never follows the OS (D-06)", () => {
    const props = renderProvider();
    expect(props.defaultTheme).toBe("court");
    expect(props.defaultTheme).toBe(DEFAULT_THEME);
    expect(props.enableSystem).toBe(false);
  });

  it("seeds and reads the storage key the Playwright seam writes (D-08)", () => {
    // If these two ever disagree, e2e/helpers/theme.ts becomes a silent no-op: the swap smoke goes
    // green while screenshotting the same theme twice.
    expect(renderProvider().storageKey).toBe(THEME_STORAGE_KEY);
    expect(THEME_STORAGE_KEY).toBe("theme");
  });

  it("declares no colour scheme, because neither name is light or dark", () => {
    expect(renderProvider().enableColorScheme).toBe(false);
  });

  it("disables transitions on change, so Phase 11's swap screenshots are deterministic", () => {
    expect(renderProvider().disableTransitionOnChange).toBe(true);
  });

  it("passes NO forced-theme prop — it would defeat both override paths (D-08)", () => {
    // The forced-theme prop short-circuits the pre-paint script BEFORE localStorage is read, so
    // neither the Playwright seam nor `?theme=` would have any effect. Its absence has no symptom,
    // which is why it is asserted rather than left to review.
    expect(renderProvider().forcedTheme).toBeUndefined();
  });

  it("guard-the-guard: the children really mount under the provider", () => {
    // Every assertion above reads a captured object. A provider that swallowed its children would
    // satisfy all of them while rendering an empty app.
    renderProvider();
    expect(screen.getByText("probe child")).toBeTruthy();
  });
});

describe("THEME-01 — the Sonner theme mapping (the bug this requirement exists for)", () => {
  it("maps court to light", () => {
    expect(sonnerThemeFor("court")).toBe("light");
  });

  it("maps grove to light", () => {
    // D-03: both named themes are light-background. This is the assertion THEME-01 exists for.
    expect(sonnerThemeFor("grove")).toBe("light");
  });

  it("maps dark to dark, so this is a real map and not a constant", () => {
    // Without this case a hardcoded `theme="light"` would pass every other test in this describe.
    expect(sonnerThemeFor("dark")).toBe("dark");
  });

  it("maps an unresolved theme to light rather than to system", () => {
    // The first client frame, before next-themes has resolved. `system` here is what made the toast
    // follow the OS in the first place, so the fallback must not be it.
    expect(sonnerThemeFor(undefined)).toBe("light");
  });

  it("never passes a named theme through to Sonner", () => {
    // Sonner's prop accepts only light|dark|system. Passing "court" type-checked for the whole life
    // of this project because a cast said it was fine.
    for (const theme of THEMES) {
      cleanup();
      expect(THEMES as readonly string[]).not.toContain(sonnerThemeFor(theme));
    }
  });

  it("guard-the-guard: Sonner was really rendered and really received props", () => {
    // Four of the assertions above would pass against `undefined` if the mock never ran.
    sonnerThemeFor("court");
    expect(captured.sonner, "the mocked Toaster never rendered").not.toBeNull();
    expect(Object.keys(captured.sonner!)).toContain("theme");
    expect(Object.keys(captured.sonner!).length).toBeGreaterThan(1);
  });
});
