import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { signUpFixture } from "../../e2e/helpers/signup-fixture";

const data = { email: "fixture@example.invalid", password: "test-only", name: "Fixture", firstName: "Fixture", intent: "book" as const };
const response = (status: number, cooldown?: string) => ({ status: () => status, headers: () => cooldown ? { "retry-after": cooldown } : {} }) as APIResponse;
const request = (post: ReturnType<typeof vi.fn>) => ({ post }) as unknown as APIRequestContext;
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
describe("signup fixture cooldown", () => {
  it("waits for the real cooldown and retries once", async () => {
    const post = vi.fn().mockResolvedValueOnce(response(429, "1")).mockResolvedValueOnce(response(200));
    const onCooldown = vi.fn(); const pending = signUpFixture(request(post), data, onCooldown);
    await vi.advanceTimersByTimeAsync(1_999); expect(post).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect((await pending).status()).toBe(200);
    expect(post).toHaveBeenCalledTimes(2); expect(onCooldown).toHaveBeenCalledWith(2_000);
  });
  it.each([undefined, "0", "-1", "NaN", "61", "999999"])("refuses missing or unbounded Retry-After %s", async (cooldown) => {
    const post = vi.fn().mockResolvedValue(response(429, cooldown)); const onCooldown = vi.fn();
    expect((await signUpFixture(request(post), data, onCooldown)).status()).toBe(429);
    expect(post).toHaveBeenCalledOnce(); expect(onCooldown).not.toHaveBeenCalled();
  });
  it.each([400, 500])("does not hide an HTTP%s error with a retry", async (status) => {
    const post = vi.fn().mockResolvedValue(response(status));
    expect((await signUpFixture(request(post), data, vi.fn())).status()).toBe(status); expect(post).toHaveBeenCalledOnce();
  });
  it("returns a second429 without another retry", async () => {
    const post = vi.fn().mockResolvedValue(response(429, "1")); const pending = signUpFixture(request(post), data, vi.fn());
    await vi.advanceTimersByTimeAsync(2_000); expect((await pending).status()).toBe(429); expect(post).toHaveBeenCalledTimes(2);
  });
});
