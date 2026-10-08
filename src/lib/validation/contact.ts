import { z } from "zod";

// Check controls BEFORE trimming so a CR/LF cannot disappear at the header boundary.
const printable = z.string().refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), "Use printable characters only.");
export const contactEmailSchema = printable.trim().max(254, "Email must be at most 254 characters.").pipe(z.email("Enter a valid email address.")).transform((value) => value.toLowerCase());
export const contactSchema = z.strictObject({
  name: printable.trim().min(1, "Enter your name.").max(100, "Name must be at most 100 characters."),
  email: contactEmailSchema,
  confirmEmail: contactEmailSchema,
  mobile: printable.trim().max(32, "Mobile number must be at most 32 characters.").refine((value) => !value || (/^[+()\d .-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ""))), "Enter a mobile number with 7–15 digits.").optional(),
  // Preserve the submitted newlines and literal text; the email renderer owns HTML escaping.
  message: z.string().min(1, "Enter your message.").max(5000, "Message must be at most 5000 characters.").refine((value) => value.trim().length > 0, "Enter your message.").refine((value) => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(value), "Remove control characters from your message."),
  website: z.literal("").optional(),
}).refine((value) => value.email === value.confirmEmail, { message: "Email addresses must match.", path: ["confirmEmail"] });

export type ContactInput = z.infer<typeof contactSchema>;
export const CONTACT_FIELDS = ["name", "email", "confirmEmail", "mobile", "message"] as const;
export type ContactField = typeof CONTACT_FIELDS[number];
export type ContactResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<ContactField, string>>; retryAfter?: number };
