// Shared auth validation schemas (Zod 4). The SAME schema validates in the RHF form
// (via @hookform/resolvers/zod) and again at the top of every server action — the client
// is never trusted (RESEARCH §Shared Zod schema).
//
// Zod 4 note: use the top-level z.email() format, NOT the Zod 3 z.string().email().
//
// `intent` is the D-02 capability choice ("book" vs "host"). The server maps it to the
// canBook/canHost flags AFTER signup — those flags are input:false on the user table, so
// the client cannot set capability directly (privilege-escalation guard, Pitfall 2).

import { z } from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(10).max(128),
  confirmPassword: z.string(),
  firstName: z.string().min(1),
  intent: z.enum(["book", "host"]), // D-02 — server maps to canBook/canHost (input:false).
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const requestResetSchema = z.object({
  email: z.email(),
});

export const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestResetInput = z.infer<typeof requestResetSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
