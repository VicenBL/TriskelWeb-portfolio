import { requirePreviewRequest } from "./preview-access";
export function withPreviewGuard(handler: (request: Request) => Response | Promise<Response>) {
 return async (request: Request): Promise<Response> => {
  const denied = requirePreviewRequest(request);
  if (denied) return denied;
  const result = await handler(request);
  const headers = new Headers(result.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Cookie, Origin");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
 };
}
