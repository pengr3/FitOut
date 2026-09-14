// Shared Zod 4 validation: the SAME schema validates client + server. These assertions
// prove the schemas reject bad input identically wherever they run (the client form and the
// server action share this one module — never trust the client).

import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  requestResetSchema,
  resetSchema,
} from "@/lib/validation/auth";

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Ann",
      intent: "book",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const r = signupSchema.safeParse({
      email: "not-an-email",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Ann",
      intent: "book",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a too-short password (< 10)", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "short",
      confirmPassword: "short",
      firstName: "Ann",
      intent: "book",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a missing intent", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Ann",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an intent outside book|host", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "Ann",
      intent: "admin",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty firstName", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "averylongpassword",
      confirmPassword: "averylongpassword",
      firstName: "",
      intent: "host",
    });
    expect(r.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "averylongpassword",
      confirmPassword: "adifferentpassword",
      firstName: "Ann",
      intent: "book",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["confirmPassword"]);
      expect(r.error.issues[0]?.message).toBe("Passwords do not match.");
    }
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("requestResetSchema", () => {
  it("accepts a valid email", () => {
    expect(requestResetSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
  it("rejects an invalid email", () => {
    expect(requestResetSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetSchema", () => {
  it("accepts a token + strong password", () => {
    expect(
      resetSchema.safeParse({ token: "tok", password: "averylongpassword" }).success
    ).toBe(true);
  });
  it("rejects a too-short password", () => {
    expect(resetSchema.safeParse({ token: "tok", password: "short" }).success).toBe(false);
  });
  it("rejects an empty token", () => {
    expect(resetSchema.safeParse({ token: "", password: "averylongpassword" }).success).toBe(
      false
    );
  });
});
