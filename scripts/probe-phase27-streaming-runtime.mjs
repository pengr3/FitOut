import { TransformStream } from "node:stream/web";
import { setImmediate } from "node:timers/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A native-only reproduction of nodejs/node#62036, fixed by nodejs/node#62040.
// https://github.com/nodejs/node/pull/62040
// Use the actual read/cancel/write interleaving, not a version-number assumption.
export async function probeStreamingRuntime() {
  const observations = [];
  for (let attempt = 0; attempt < 32; attempt++) {
    const stream = new TransformStream({ transform(value, controller) { controller.enqueue(value); } });
    // Settle the constructor's start promise before the concurrent lifecycle operations.
    await setImmediate();
    const reader = stream.readable.getReader();
    const writer = stream.writable.getWriter();
    const results = await Promise.allSettled([
      reader.read(), reader.cancel(new Error("phase27-synthetic-disconnect")), writer.write("synthetic-late-chunk"),
    ]);
    observations.push(results.map((result) => ({
      status: result.status,
      ...(result.status === "rejected" ? { name: result.reason?.name, message: result.reason?.message } : {}),
    })));
    reader.releaseLock();
    writer.releaseLock();
  }
  const internalTypeErrors = observations.flat().filter((result) => result.message?.includes("transformAlgorithm is not a function")).length;
  return { node: process.version, execPath: process.execPath, attempts: observations.length, internalTypeErrors, observations };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await probeStreamingRuntime();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.internalTypeErrors ? 1 : 0;
}
