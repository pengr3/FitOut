// @vitest-environment jsdom
import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProgressiveSearchOverlay } from "@/components/search/progressive-search-overlay";
import { Button } from "@/components/ui/button";

afterEach(cleanup);

function SearchHarness({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  return <ProgressiveSearchOverlay
    open={open}
    trigger={<Button onClick={() => setOpen(true)}>Start your search</Button>}
    onDismiss={() => setOpen(false)}
    desktopPresentation={compact ? "compact" : "standard"}
    onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus(); }}
  >
    <h2 ref={heading} tabIndex={-1}>Choose an activity</h2>
    <input aria-label="Activity filter" value={value} onChange={(event) => setValue(event.target.value)} />
    <Button onClick={() => setOpen(false)}>Cancel</Button>
  </ProgressiveSearchOverlay>;
}

it("opens the shared controlled dialog and keeps the actual input when presentation changes", async () => {
  const { rerender } = render(<SearchHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Start your search" }));
  await screen.findByRole("dialog", { name: "Search spaces" });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Choose an activity" })));
  const input = screen.getByRole("textbox", { name: "Activity filter" });
  fireEvent.change(input, { target: { value: "basket" } });
  rerender(<SearchHarness compact />);
  expect(screen.getAllByRole("dialog", { name: "Search spaces" })).toHaveLength(1);
  expect(screen.getByRole("textbox", { name: "Activity filter" })).toBe(input);
  expect((input as HTMLInputElement).value).toBe("basket");
  fireEvent.keyDown(input, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Search spaces" })).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Start your search" })));
});
