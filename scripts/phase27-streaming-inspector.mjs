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
    let resumed = false;
    const resume = () => { if (!resumed) { resumed = true; session.post("Debugger.resume"); } };
    try {
      const description = params.data?.description ?? "";
      if (description.includes("transformAlgorithm is not a function")) {
        const frames = params.callFrames.map((frame) => ({
          functionName: frame.functionName,
          url: scripts.get(frame.location.scriptId) ?? frame.url,
          line: frame.location.lineNumber + 1,
          column: frame.location.columnNumber + 1,
        }));
        const asyncFrames = (trace) => trace ? { description: trace.description, frames: trace.callFrames.map((frame) => ({ functionName: frame.functionName, url: frame.url, line: frame.lineNumber + 1, column: frame.columnNumber + 1 })), parent: asyncFrames(trace.parent) } : undefined;
        const record = { at: new Date().toISOString(), pid: process.pid, description: description.split("\n")[0], frames, asyncStack: asyncFrames(params.asyncStackTrace) };
        const persist = (streamState) => {
          try { fs.appendFileSync(path.join(process.env.FITOUT_STREAMING_RUN_DIR, "exceptions.jsonl"), JSON.stringify({ ...record, streamState }) + "\n"); }
          finally { resume(); }
        };
        if (params.callFrames[0]?.functionName === "transformStreamDefaultControllerPerformTransform") {
          // Evaluate only this explicit native state projection. Never inspect chunk, locals,
          // request headers, session objects, or arbitrary object properties.
          session.post("Debugger.evaluateOnCallFrame", {
            callFrameId: params.callFrames[0].callFrameId, returnByValue: true,
            expression: "({transformAlgorithm:typeof controller[kState].transformAlgorithm,flushAlgorithm:typeof controller[kState].flushAlgorithm,readableState:controller[kState].stream[kState].readable[kState].state,writableState:controller[kState].stream[kState].writable[kState].state,backpressure:controller[kState].stream[kState].backpressure})",
          }, (error, result) => persist(error || result.exceptionDetails ? { unavailable: true } : result.result.value));
        } else persist(undefined);
      }
    } finally {
      resume();
    }
  });
  session.post("Debugger.enable", () => {
    session.post("Debugger.setAsyncCallStackDepth", { maxDepth: 32 });
    session.post("Debugger.setPauseOnExceptions", { state: "all" });
  });
}
