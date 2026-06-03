// Placeholder schema.
//
// Plan 02 (Better Auth) populates the real auth tables here via the Better Auth CLI
// (`npx @better-auth/cli generate`) plus profile/capability `additionalFields`.
// DO NOT hand-write auth tables now — the CLI owns the auth-table shape (see RESEARCH Pitfall 1).
//
// This empty export just makes `import * as schema from "./schema"` in index.ts resolve.
export {};
