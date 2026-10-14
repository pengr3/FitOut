import {describe,expect,it} from "vitest";
import {browserTestDatabase} from "../../e2e/helpers/browser-test-database";

describe("browser database isolation", () => {
  it("ignores ambient database credentials outside GitHub Actions", () => {
    expect(browserTestDatabase({DATABASE_URL:"postgres://owner:secret@primary.example.com/prod"})).toBe("postgresql://fitout:fitout@localhost:5432/fitout_test");
    expect(browserTestDatabase({CI:"true",DATABASE_URL:"postgres://owner:secret@primary.example.com/prod"})).toBe("postgresql://fitout:fitout@localhost:5432/fitout_test");
  });
  it("accepts the committed ephemeral CI service", () => {
    expect(browserTestDatabase({CI:"true",GITHUB_ACTIONS:"true",DATABASE_URL:"postgres://fitout:fitout@postgres:5432/fitout_test"})).toBe("postgres://fitout:fitout@postgres:5432/fitout_test");
  });
  it.each([
    undefined,
    "postgres://fitout:fitout@postgres:5432/fitout",
    "postgres://fitout:fitout@primary.example.com:5432/fitout_test",
    "postgres://owner:secret@postgres:5432/fitout_test",
    "postgres://fitout:fitout@postgres:5432/fitout_test?sslmode=require",
    "postgres://fitout:fitout@localhost:5432/fitout_test",
  ])("refuses unrecognized CI database %s", (DATABASE_URL) => {
    expect(()=>browserTestDatabase({CI:"true",GITHUB_ACTIONS:"true",DATABASE_URL})).toThrow(/exact ephemeral/);
  });
});
