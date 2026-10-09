import inspector from "node:inspector";
import fs from "node:fs";
import path from "node:path";
// Diagnostic-only preload: retain the exception's frames, never locals or request data.
// Every pause is immediately resumed; this does not suppress or replace an exception.
if (process.env.FITOUT_STREAMING_DIAGNOSTICS === "1") {
  const session = new inspector.Session();
  const scripts = new Map();
  session.connect();
  session.on("Debugger.scriptParsed", ({ params }) => scripts.set(params.scriptId, params.url));
  session.on("Debugger.paused", ({ params }) => {
    try {
      const description = params.data?.description ?? "";
      if (description.includes("transformAlgorithm is not a function")) {
        const frames = params.callFrames.map((frame) => ({
          functionName: frame.functionName,
          url: scripts.get(frame.location.scriptId) ?? frame.url,
          line: frame.location.lineNumber + 1,
          column: frame.location.columnNumber + 1,
        }));
        fs.appendFileSync(path.join(process.env.FITOUT_STREAMING_RUN_DIR, "exceptions.jsonl"),
          JSON.stringify({ at: new Date().toISOString(), pid: process.pid, description: description.split("\n")[0], frames }) + "\n");
      }
    } finally {
      session.post("Debugger.resume");
    }
  });
  session.post("Debugger.enable", () => session.post("Debugger.setPauseOnExceptions", { state: "all" }));
}
