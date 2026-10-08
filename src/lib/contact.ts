import "server-only";

// Importable RED scaffold; implemented after the route behavior gate passes.
export async function handleContact(_request: Request): Promise<Response> {
  return Response.json({ ok: false }, { status: 503 });
}
