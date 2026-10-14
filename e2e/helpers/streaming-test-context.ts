type StreamingEnvironment = Partial<NodeJS.ProcessEnv>;

// Ordinary functional CI measures its own dev server. The separate production
// runner must supply an explicit diagnostic directory and port; it cannot fall back.
export function streamingTestContext(env: StreamingEnvironment, baseURL: string, outputDir: string) {
  const standalone = env.FITOUT_STREAMING_SERVER !== undefined;
  if (standalone && !["dev", "production"].includes(env.FITOUT_STREAMING_SERVER!)) throw new Error("Unknown streaming runner mode");
  if (standalone && (!env.FITOUT_STREAMING_RUN_DIR || !env.FITOUT_STREAMING_PORT)) throw new Error("Standalone streaming requires an explicit directory and port");
  if (!standalone && (env.FITOUT_STREAMING_PORT !== undefined || env.FITOUT_STREAMING_RUN_DIR !== undefined)) throw new Error("Standalone settings require an explicit mode");
  const base = new URL(baseURL);
  if (base.hostname !== "localhost" || base.protocol !== "http:") throw new Error("Streaming browser proof requires local HTTP");
  const port = Number(env.FITOUT_STREAMING_PORT ?? base.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid streaming test port");
  return { standalone, production: env.FITOUT_STREAMING_SERVER === "production", port,
    origin: `http://localhost:${port}`, runDir: standalone ? env.FITOUT_STREAMING_RUN_DIR! : outputDir };
}
