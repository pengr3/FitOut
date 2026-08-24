// The EMAIL-03 preview harness — `npm run email:previews -- <address> [--send]`.
//
// WHY THIS EXISTS. EMAIL-03 is a manual UAT by construction: no CI job can open Gmail on an Android
// phone and say whether the CTA is tappable. The automated half of Phase 15 proves that nineteen
// senders compose one shell and that nothing adversarial survives escaping; it proves nothing about
// what an inbox draws. This script produces the input to the human half — one of each send, in one
// named inbox, in a printed order the operator can match against. The record of the walk itself lives
// in .planning/phases/15-auth-profile-transactional-email/15-UAT-EMAIL.md, and a row there is filled
// in by the operator, never by this script.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// (1) THIS IS A HARNESS, NOT A DISPATCHER — D-83
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-83: transactional sends are invoked ONLY from the Inngest notify function, never fire-and-forget
// from an action or a route. That boundary is what makes a send retryable and auditable, and it is
// the reason `src/lib/email.ts`'s header spends a paragraph on it.
//
// This file lives OUTSIDE `src/app`, moves no product call site, and reinstates none of the
// `void`-prefixed dispatch D-83 forbids. It reaches the senders the only way a non-product caller may:
// by importing the exported functions directly and awaiting them, in a short-lived process a human
// started on purpose. Nothing in the running application can reach this file. If you ever find
// yourself wanting to import THIS module from `src/`, the thing you want is an Inngest event.
//
// It also touches no database — unlike `scripts/ops-alerts.ts`, which needs its own standalone client,
// this script has no data layer at all. The nineteen argument lists are fixtures, not rows.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// (2) IT SENDS REAL MAIL — BUT ONLY WHEN YOU SAY `--send`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `RESEND_API_KEY` is live and uncommented in `.env.local`, so a naive run of this file would put 23
// real messages into a real mailbox on its first invocation. Two things stand between you and that:
//
//   • THE DESTINATION IS A REQUIRED ARGUMENT WITH NO DEFAULT (T-15-16). There is no hard-coded inbox
//     in this file and there must never be one. The address to use is the ACCOUNT OWNER's — the
//     mailbox belonging to whoever holds the Resend account. Under 15-CONTEXT D-160 the account is in
//     test mode, and test mode will only deliver to that owner address; any other recipient is
//     rejected by the provider rather than quietly delivered somewhere unintended. That is the
//     backstop, not the plan: name the inbox you mean, on the command line, every time.
//
//   • DELIVERY IS OPT-IN. Without `--send` the harness runs in PREVIEW mode: it exercises the exact
//     same code path, captures each composed message, writes the HTML and plain-text parts to a
//     directory outside the repository, and forwards NOTHING to the network. Preview mode is the
//     default because the default should never be the irreversible one. In preview mode any attempted
//     network call — to Resend or anywhere else — throws.
//
//   • `EMAIL_FROM` is absent from the environment, so the sender address falls back to the sandbox
//     literal in `src/lib/email.ts`. That is what D-160 intends; do not set it for this walk.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// (3) THE FIXTURES ARE SHARED WITH `tests/auth/email-injection.test.ts`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/helpers/email-fixtures.ts` owns ONE argument list per exported sender, keyed on a union the
// compiler derives from the email module's own exports, so a twentieth sender without a fixture is a
// compile error. Two readers, one owner: the injection probe drives an adversarial payload through
// those lists, and this harness delivers them. DO NOT fork them into a second copy here. Two sets
// drift, and the set that drifts is always the one nobody is watching.
//
// ⚠ NINETEEN SENDERS, TWENTY-THREE MESSAGES. Four senders branch on a copy variant and carry two
// fixture calls each — `sendRequestDeclined` (declined / expired), `sendHostCancellationRecord` (fee /
// no fee), `sendGroupRsvpReceived` (yes / no) and `sendGuestRsvpEmail` (confirmed / cancelled). The
// harness sends every call of every fixture and says so in its output, so an operator counting
// messages against senders is never left wondering which four arrived twice.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO TRAPS THIS FILE IS BUILT AROUND — read before editing
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// TRAP A — `tsx` DOES NOT LOAD `.env.local`, AND `src/lib/email.ts` READS THE KEY AT IMPORT TIME.
// `const key = process.env.RESEND_API_KEY` runs once, when the module is first evaluated. A static
// `import` of `@/lib/email` is hoisted above every statement in this file, so the module would capture
// the environment BEFORE the harness had a chance to populate it — and take the dev-fallback branch
// forever, printing bodies to a console instead of composing a request. That is why the email module
// is loaded through a DYNAMIC `import()` below, after the environment is settled. Do not "tidy" it
// into a static import. (`scripts/ops-alerts.ts` records the same "tsx doesn't load .env" fact for the
// database URL; this is the same fact with a sharper edge, because the read is memoised.)
//
// TRAP B — `send()` SWALLOWS PROVIDER ERRORS. `src/lib/email.ts`'s transport logs `resend error` and
// returns; it resolves the same way whether the provider accepted the message or rejected all 23. A
// harness that counted resolved promises would print "23 sent" over a completely empty inbox, and the
// operator would go looking for messages that were never accepted. So the harness OBSERVES the
// transport instead of trusting it: it wraps `globalThis.fetch`, reads the composed payload on its way
// out (subject, recipient, both parts) and the provider's status on the way back, and reports what
// actually happened per message. This is also what makes preview mode possible, and what supplies the
// M3 byte measurement — the HTML size printed per message is the real request body, not an estimate.
//
// The wrapper is restored before the process exits and is never installed into anything but this
// short-lived process.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// TYPE-ONLY, and load-bearing rather than decorative: it is erased at runtime (so it cannot trip
// TRAP A by evaluating the module before the environment is settled), and it is what makes the
// sender lookup below a TYPED index into the email module's real exports. A fixture naming a sender
// this module does not export stops being a runtime surprise and becomes a `tsc` error here.
import type * as EmailSenders from "@/lib/email";

import {
  SENDER_COUNT,
  SENDER_FIXTURES,
  SENDER_NAMES,
  withValueAt,
  type SenderCall,
  type SenderName,
} from "../tests/helpers/email-fixtures";

/** The provider host. Every request to it is observed; in preview mode none of them leave. */
const RESEND_API_HOST = "api.resend.com";

/**
 * The key preview mode installs so the email module builds a client whose requests this harness
 * intercepts. It is not a credential and cannot become one: in preview mode the wrapper throws on any
 * outbound call rather than forwarding, so this string never reaches a socket.
 */
const PREVIEW_MODE_KEY = "re_preview_mode_this_value_never_leaves_the_process";

const USAGE = `
  npm run email:previews -- <destination-address> [--send] [--delay=<ms>] [--out=<dir>]

  <destination-address>  REQUIRED. The account-owner inbox to walk (15-CONTEXT D-160 — the Resend
                         account is in test mode and will only deliver there). There is no default
                         and there must never be one.

  --send                 Actually deliver through Resend. Without it the harness runs in PREVIEW
                         mode: same code path, messages captured and written to disk, nothing sent.
  --delay=<ms>           Pause between messages when sending (default 700ms — the provider rate
                         limit is the reason). Ignored in preview mode.
  --out=<dir>            Where to write the captured .html/.txt parts. Defaults to a timestamped
                         directory under the system temp dir, i.e. outside the repository.

  Sends 23 messages for 19 senders: four senders carry two copy variants each.
`;

type CapturedMessage = {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
};

type Dispatch = {
  readonly index: number;
  readonly sender: SenderName;
  readonly label: string;
  readonly subject: string;
  readonly to: string;
  readonly htmlBytes: number;
  readonly textBytes: number;
  readonly outcome: "delivered" | "captured" | "rejected" | "not-dispatched";
  readonly detail: string;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Arguments
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const positional = argv.filter((a) => !a.startsWith("--"));

const destination = positional[0];
const live = flags.includes("--send");
const wantsHelp = flags.includes("--help") || flags.includes("-h");

function flagValue(name: string): string | undefined {
  const hit = flags.find((f) => f.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
}

function fail(message: string): never {
  console.error(`\nemail:previews — ${message}`);
  console.error(USAGE);
  process.exit(1);
}

if (wantsHelp) {
  console.log(USAGE);
  process.exit(0);
}

// The refusal that keeps a destination out of this file (T-15-16).
if (!destination) {
  fail("no destination address given. Name the inbox you are walking; there is no default.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
  fail(`"${destination}" is not an email address. The FIRST positional argument is the destination.`);
}

const delayMs = live ? Number(flagValue("--delay") ?? 700) : 0;
if (!Number.isFinite(delayMs) || delayMs < 0) fail("--delay must be a non-negative number of ms.");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = resolve(flagValue("--out") ?? join(tmpdir(), "fitout-email-previews", stamp));

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Environment — see TRAP A. Everything here must happen before the email module is imported.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Read an allow-listed pair out of `.env.local` without overriding what the shell already exported.
 * Deliberately narrow: this script has no business importing the rest of the file's contents.
 */
function loadFromEnvLocal(keys: readonly string[]): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!keys.includes(key) || process.env[key]) continue;
    process.env[key] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

if (live) {
  loadFromEnvLocal(["RESEND_API_KEY", "EMAIL_FROM"]);
  if (!process.env.RESEND_API_KEY) {
    fail(
      "--send was given but RESEND_API_KEY is not set and was not found in .env.local. " +
        "Uncomment it there, or export it, then re-run.",
    );
  }
} else {
  // Preview mode composes through the same client and intercepts every request; see TRAP B.
  process.env.RESEND_API_KEY = PREVIEW_MODE_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The transport observer — see TRAP B.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

let captured: CapturedMessage | null = null;
let providerStatus: number | null = null;
let providerDetail = "";

const realFetch = globalThis.fetch;

/**
 * The three observations, read through functions ON PURPOSE.
 *
 * TypeScript's control-flow analysis does not know that awaiting a sender runs the wrapper above, so
 * reading these module-level bindings directly leaves them narrowed to the `null` they were reset to
 * a line earlier — and every field access on the result becomes an error against `never`. Reading
 * through a function returns the DECLARED type, which is the truth here. Do not inline these.
 */
const readCaptured = (): CapturedMessage | null => captured;
const readStatus = (): number | null => providerStatus;
const readDetail = (): string => providerDetail;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (!url.includes(RESEND_API_HOST)) {
    if (!live) {
      throw new Error(
        `email:previews — preview mode makes no network calls; blocked a request to ${url}. ` +
          "Pass --send if you meant to deliver.",
      );
    }
    return realFetch(input, init);
  }

  const body =
    typeof init?.body === "string"
      ? (JSON.parse(init.body) as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  captured = {
    from: String(body.from ?? ""),
    to: Array.isArray(body.to) ? body.to.join(", ") : String(body.to ?? ""),
    subject: String(body.subject ?? ""),
    html: String(body.html ?? ""),
    text: String(body.text ?? ""),
  };

  if (!live) {
    providerStatus = 200;
    providerDetail = "captured (not sent)";
    return new Response(JSON.stringify({ id: `preview-${stamp}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const response = await realFetch(input, init);
  providerStatus = response.status;
  try {
    const echo = (await response.clone().json()) as Record<string, unknown>;
    providerDetail = response.ok
      ? `id ${String(echo.id ?? "?")}`
      : `${String(echo.name ?? "error")}: ${String(echo.message ?? "")}`;
  } catch {
    providerDetail = response.ok ? "accepted" : `HTTP ${response.status}`;
  }
  return response;
}) as typeof fetch;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The walk
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const bytes = (s: string): number => Buffer.byteLength(s, "utf8");
const pad = (n: number, width: number): string => String(n).padStart(width, "0");
const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

async function main(): Promise<void> {
  if (SENDER_NAMES.length !== SENDER_COUNT) {
    console.error(
      `email:previews — the fixture module declares ${SENDER_COUNT} senders but carries ` +
        `${SENDER_NAMES.length}. Fix tests/helpers/email-fixtures.ts before walking an inbox.`,
    );
    process.exit(1);
  }

  // TRAP A: dynamic, and only now that the environment is settled. Typed against the static
  // type-only import above, so the lookup inside the loop is checked rather than stringly-guessed.
  const senders = (await import("@/lib/email")) as typeof EmailSenders;

  const plan: Array<{ sender: SenderName; call: SenderCall }> = [];
  for (const sender of SENDER_NAMES) {
    const fixture = SENDER_FIXTURES[sender] as unknown as { readonly calls: readonly SenderCall[] };
    for (const call of fixture.calls) plan.push({ sender, call });
  }

  mkdirSync(outDir, { recursive: true });

  const mode = live ? "SENDING (real mail)" : "PREVIEW (nothing is sent)";
  console.log(`\nemail:previews — ${mode}`);
  console.log(`  destination : ${destination}`);
  console.log(`  senders     : ${SENDER_NAMES.length}`);
  console.log(`  messages    : ${plan.length}  (four senders carry two copy variants each)`);
  console.log(`  written to  : ${outDir}`);
  console.log("");

  const dispatches: Dispatch[] = [];

  for (const [i, { sender, call }] of plan.entries()) {
    const index = i + 1;
    const args = withValueAt(call.args, call.recipient, destination);

    captured = null;
    providerStatus = null;
    providerDetail = "";

    const fn: unknown = senders[sender];
    if (typeof fn !== "function") {
      dispatches.push({
        index,
        sender,
        label: call.label,
        subject: "",
        to: destination,
        htmlBytes: 0,
        textBytes: 0,
        outcome: "not-dispatched",
        detail: `"${sender}" is not an exported function of @/lib/email`,
      });
      continue;
    }

    let thrown = "";
    try {
      await (fn as (...a: readonly unknown[]) => unknown)(...args);
    } catch (error) {
      thrown = error instanceof Error ? error.message : String(error);
    }

    const message = readCaptured();
    const status = readStatus();
    const outcome: Dispatch["outcome"] = !message
      ? "not-dispatched"
      : status !== null && status >= 400
        ? "rejected"
        : live
          ? "delivered"
          : "captured";

    const dispatch: Dispatch = {
      index,
      sender,
      label: call.label,
      subject: message?.subject ?? "",
      to: message?.to ?? destination,
      htmlBytes: message ? bytes(message.html) : 0,
      textBytes: message ? bytes(message.text) : 0,
      outcome,
      detail: thrown !== "" ? `threw: ${thrown}` : readDetail(),
    };
    dispatches.push(dispatch);

    if (message) {
      const base = `${pad(index, 2)}-${sender}-${slug(call.label)}`;
      writeFileSync(join(outDir, `${base}.html`), message.html, "utf8");
      writeFileSync(join(outDir, `${base}.txt`), message.text, "utf8");
    }

    console.log(`[${pad(index, 2)}/${plan.length}] ${sender} — ${call.label}`);
    console.log(
      `          subject: ${message ? JSON.stringify(message.subject) : "(none — nothing left the sender)"}`,
    );
    console.log(
      `          html: ${dispatch.htmlBytes} B · text: ${dispatch.textBytes} B · ${dispatch.outcome}` +
        (dispatch.detail ? ` · ${dispatch.detail}` : ""),
    );

    if (delayMs > 0 && index < plan.length) await sleep(delayMs);
  }

  globalThis.fetch = realFetch;

  // The ordered list the operator matches against the inbox, written beside the parts.
  const indexLines = dispatches.map(
    (d) =>
      `| ${pad(d.index, 2)} | \`${d.sender}\` | ${d.label} | ${d.subject.replace(/\|/g, "\\|")} | ${d.htmlBytes} | ${d.outcome} |`,
  );
  writeFileSync(
    join(outDir, "index.md"),
    [
      `# email:previews — ${stamp}`,
      "",
      `Mode: ${mode}. Destination: ${destination}.`,
      "",
      "| # | Sender | Variant | Subject | HTML bytes | Outcome |",
      "| - | ------ | ------- | ------- | ---------- | ------- |",
      ...indexLines,
      "",
    ].join("\n"),
    "utf8",
  );

  const failed = dispatches.filter((d) => d.outcome === "rejected" || d.outcome === "not-dispatched");
  const largest = [...dispatches].sort((a, b) => b.htmlBytes - a.htmlBytes)[0];

  console.log("");
  console.log(
    `  ${dispatches.length - failed.length}/${dispatches.length} ${live ? "accepted by the provider" : "composed and captured"}` +
      `, from ${SENDER_NAMES.length} senders.`,
  );
  if (largest) {
    console.log(
      `  M3 input — largest HTML part: ${largest.htmlBytes} B (${largest.sender} — ${largest.label}).`,
    );
  }
  console.log(`  Parts and index.md: ${outDir}`);

  if (failed.length > 0) {
    console.error("");
    for (const d of failed) {
      console.error(`  ✗ ${pad(d.index, 2)} ${d.sender} — ${d.label}: ${d.outcome} ${d.detail}`);
    }
    console.error(
      `\n  ${failed.length} message(s) never reached the inbox. Do NOT record a walk against them.`,
    );
    process.exit(1);
  }

  if (!live) {
    console.log("\n  Nothing was sent. Re-run with --send to deliver to the address above.\n");
  } else {
    console.log(`\n  Now open ${destination} and work through 15-UAT-EMAIL.md.\n`);
  }
}

main().catch((error: unknown) => {
  globalThis.fetch = realFetch;
  console.error("email:previews — failed:", error);
  process.exit(1);
});
