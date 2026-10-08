"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { CONTACT_FIELDS, contactSchema, type ContactInput } from "@/lib/validation/contact";

const initialValues: ContactInput = { name: "", email: "", confirmEmail: "", mobile: "", message: "", website: "" };
const fields = [
  { name: "name", label: "Name", autoComplete: "name", type: "text", maxLength: 100, required: true },
  { name: "email", label: "Email", autoComplete: "email", type: "email", maxLength: 254, required: true },
  { name: "confirmEmail", label: "Confirm Email", autoComplete: "off", type: "email", maxLength: 254, required: true },
  { name: "mobile", label: "Mobile Number (optional)", autoComplete: "tel", type: "tel", maxLength: 32, required: false },
  { name: "message", label: "Message", autoComplete: "off", type: "text", maxLength: 5000, required: true },
] as const;
const failed = "Your message could not be sent. Please try again later.";

export function ContactForm() {
  const form = useForm<ContactInput>({ resolver: zodResolver(contactSchema), defaultValues: initialValues });
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function submit(input: ContactInput) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true); setFeedback("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(input) });
      const result: unknown = await response.json();
      const data = result && typeof result === "object" ? result as Record<string, unknown> : {};
      if (response.status === 200 && data.ok === true) {
        setSent(true); setFeedback("Your message was sent to FitOut.");
      } else if (response.status === 400) {
        const errors = data.fieldErrors && typeof data.fieldErrors === "object" ? data.fieldErrors as Record<string, unknown> : {};
        let focused = false;
        for (const field of CONTACT_FIELDS) {
          const message = errors[field];
          if (typeof message === "string" && message.length > 0 && message.length <= 200) {
            form.setError(field, { type: "server", message }, { shouldFocus: !focused });
            focused = true;
          }
        }
        setFeedback("Check your contact details and try again.");
      } else if (response.status === 429) {
        const seconds = Number(response.headers.get("Retry-After") ?? data.retryAfter);
        const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, Math.max(1, Math.ceil(seconds))) : 60;
        setFeedback(`Too many attempts. Please try again in ${retryAfter} seconds.`);
      } else { setFeedback(failed); }
    } catch { setFeedback("Check your connection and try again. Your message has not been sent."); }
    finally { inFlight.current = false; setPending(false); }
  }

  return (
    <div className="space-y-5">
      <p role="status" aria-live="polite" aria-atomic="true" className="text-body">{feedback}</p>
      {sent ? (
        <Button type="button" variant="outline" onClick={() => { form.reset(initialValues); setSent(false); setFeedback(""); }}>Write another message</Button>
      ) : (
        <Form {...form}>
          <form noValidate onSubmit={(event) => { void form.handleSubmit(submit)(event); }} aria-busy={pending} className="space-y-5">
            {fields.map(({ name, label, autoComplete, type, maxLength, required }) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    {name === "message" ? (
                      <Textarea {...field} required maxLength={maxLength} rows={6} autoComplete={autoComplete} className="min-h-40" />
                    ) : (
                      <Input {...field} value={field.value ?? ""} type={type} inputMode={type === "email" ? "email" : type === "tel" ? "tel" : "text"} autoComplete={autoComplete} required={required} maxLength={maxLength} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
            <div hidden aria-hidden="true"><input {...form.register("website")} aria-hidden="true" tabIndex={-1} autoComplete="off" /></div>
            <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
          </form>
        </Form>
      )}
    </div>
  );
}
