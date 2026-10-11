// Loopback HTTP harness importing the real route, limiter, quota and schema.
// This is never part of an app route or deployment.
import { createServer } from "node:http";
import { POST } from "../../src/app/api/contact/route";
import { client, transport } from "./contact-instance-db";
async function main() {
  const rows = await client`SELECT pg_backend_pid() AS pid`;
  let requests = 0;
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (incoming.method === "GET" && incoming.url === "/meta") {
        outgoing.setHeader("Content-Type", "application/json");
        outgoing.end(JSON.stringify({ pid: process.pid, databasePid: rows[0].pid, requests, transportAttempts: transport.attempts }));
        return;
      }
      if (incoming.method !== "POST" || incoming.url !== "/api/contact") { outgoing.writeHead(404).end(); return; }
      requests++;
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of incoming) {
        length += chunk.length;
        if (length > 65536) { outgoing.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(",") : value);
      }
      const result = await POST(new Request("http://marketing.localhost/api/contact", {
        method: "POST", headers, body: Buffer.concat(chunks),
      }));
      outgoing.writeHead(result.status, Object.fromEntries(result.headers));
      outgoing.end(await result.text());
    } catch { outgoing.writeHead(500).end("Test harness failure"); }
  });
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing loopback address");
    process.send?.({ port: address.port, pid: process.pid, databasePid: rows[0].pid });
  });
  process.on("message", async (message) => {
    if (message === "stop") {
      await new Promise<void>(resolve => server.close(() => resolve()));
      await client.end();
      process.exit(0);
    }
  });
}
main().catch(() => { process.exitCode = 1; });
