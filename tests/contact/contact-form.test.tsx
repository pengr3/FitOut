// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactForm } from "@/components/marketing/contact-form";
const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fill(confirmEmail = "person@example.com", mobile = "") {
  for (const [label, value] of [["Name", "Visitor"], ["Email", "person@example.com"], ["Confirm Email", confirmEmail], ["Mobile Number (optional)", mobile], ["Message", "A question\nabout FitOut"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function submit() { fireEvent.click(screen.getByRole("button", { name: "Send message" })); }
function valuesRetained() {
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Visitor");
  expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("person@example.com");
  expect((screen.getByLabelText("Confirm Email") as HTMLInputElement).value).toBe("person@example.com");
  expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("A question\nabout FitOut");
}
describe("recoverable marketing Contact form", () => {
  it("renders the exact five fields in order with an optional phone", () => {
    const { container } = render(<ContactForm />);
    const labels = Array.from(container.querySelectorAll("label")).map((label) => label.textContent);
    expect(labels, "the five Contact fields must be rendered in the approved order").toEqual(["Name", "Email", "Confirm Email", "Mobile Number (optional)", "Message"]);
    for (const label of labels) expect(screen.getByLabelText(label!)).toBeTruthy();
    expect(screen.getByLabelText("Message").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Mobile Number (optional)").getAttribute("required")).toBeNull();
    for (const label of ["Name", "Email", "Confirm Email", "Message"]) expect(screen.getByLabelText(label).getAttribute("required")).not.toBeNull();
    const trap = container.querySelector('input[name="website"]')!;
    expect(trap.getAttribute("tabindex")).toBe("-1"); expect(trap.getAttribute("aria-hidden")).toBe("true");
  });
  it("requires matching emails before sending and focuses the invalid field", async () => {
    render(<ContactForm />); fill("another@example.com"); submit();
    await waitFor(() => expect(screen.getByText("Email addresses must match.")).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText("Confirm Email"));
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("A question\nabout FitOut");
  });
  it("allows no mobile, posts to same origin and announces only accepted success", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true })); render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Your message was sent to FitOut."));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact"); expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "Visitor", email: "person@example.com", confirmEmail: "person@example.com", mobile: "", message: "A question\nabout FitOut", website: "" });
    fireEvent.click(screen.getByRole("button", { name: "Write another message" }));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  });
  it("prevents duplicate submits while pending", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    const { container } = render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByRole("button", { name: "Sending…" }).getAttribute("disabled")).not.toBeNull());
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe("true");
    fireEvent.submit(container.querySelector("form")!); fireEvent.submit(container.querySelector("form")!);
    await act(async () => { await Promise.resolve(); }); expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => resolve(Response.json({ ok: true })));
  });
  it.each([503, 403, 413, 500])("retains every value and allows retry on status %i", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ ok: false }, { status })); render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("could not be sent")); valuesRetained();
    expect(screen.getByRole("button", { name: "Send message" }).getAttribute("disabled")).toBeNull();
    fetchMock.mockResolvedValue(Response.json({ ok: true })); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Your message was sent to FitOut."));
  });
  it("maps server validation inline and focuses first field without clearing", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: false, fieldErrors: { name: "Check your name.", confirmEmail: "Check your email." } }, { status: 400 }));
    render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByText("Check your name.")).toBeTruthy());
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe("true"); valuesRetained();
  });
  it("reports bounded 429 retry feedback with data retained", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: false, retryAfter: 999999 }, { status: 429, headers: { "Retry-After": "999999" } }));
    render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("3600 seconds")); valuesRetained();
  });
  it("recovers from network and malformed response errors without success", async () => {
    fetchMock.mockRejectedValue(new Error("network")); render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("connection")); valuesRetained();
    fetchMock.mockResolvedValue(new Response("invalid", { status: 200 })); submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Send message" }).getAttribute("disabled")).toBeNull()); valuesRetained();
    expect(screen.getByRole("status").textContent).not.toContain("was sent");
  });
  it.each([[200, { ok: false }], [202, { ok: true }], [503, { ok: true }], [200, { ok: "true" }]])("rejects nonaccepted contract %i %j", async (status, body) => {
    fetchMock.mockResolvedValue(Response.json(body, { status })); render(<ContactForm />); fill(); submit();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("could not be sent")); valuesRetained();
  });
});
